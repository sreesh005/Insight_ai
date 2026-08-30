// Insight.ai - Chrome Extension Background Service Worker (Manifest V3)

// Configure Side Panel behavior to open on action click
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting panel behavior:', error));
}

// Helper to configure side panel availability for a specific tab
async function updateSidePanelForTab(tabId, url) {
  if (!chrome.sidePanel || !chrome.sidePanel.setOptions) return;
  const isYouTube = url && (url.includes('youtube.com/watch') || url.includes('youtube.com/shorts') || url.includes('youtube.com'));
  try {
    if (isYouTube) {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'sidepanel.html',
        enabled: true
      });
    } else {
      // Disable side panel for non-YouTube tabs to take it off the side
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        enabled: false
      });
    }
  } catch (err) {
    // Some tabs (like chrome:// or extension pages) cannot have options set
  }
}

// Find the active YouTube tab across windows with multi-level fallback
async function getTargetYouTubeTab() {
  // 1. Try active tab in the last focused window
  let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs[0]?.url && tabs[0].url.includes('youtube.com')) {
    return tabs[0];
  }

  // 2. Try active tab in the current window
  tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.url && tabs[0].url.includes('youtube.com')) {
    return tabs[0];
  }

  // 3. Try any active tab across all windows
  tabs = await chrome.tabs.query({ active: true });
  const activeYt = tabs.find((t) => t.url && t.url.includes('youtube.com'));
  if (activeYt) {
    return activeYt;
  }

  // 4. Try any YouTube watch tab anywhere
  tabs = await chrome.tabs.query({ url: '*://*.youtube.com/watch*' });
  if (tabs.length > 0) {
    return tabs[0];
  }

  return null;
}

// Helper to parse Video ID and basic metadata from tab object directly
function parseVideoFromTab(tab) {
  if (!tab || !tab.url) return null;
  try {
    const url = new URL(tab.url);
    let videoId = url.searchParams.get('v') || '';
    if (!videoId && url.pathname.startsWith('/shorts/')) {
      videoId = url.pathname.replace('/shorts/', '').split('/')[0];
    }
    if (!videoId) return null;

    let title = tab.title ? tab.title.replace(/ - YouTube$/, '').trim() : '';
    if (!title || title.includes('www.youtube.com')) {
      title = `YouTube Video (${videoId})`;
    }

    return {
      videoId,
      title,
      channel: 'YouTube Creator',
      currentTime: 0,
      duration: 0,
      isPaused: true,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: tab.url,
      tabId: tab.id
    };
  } catch (e) {
    return null;
  }
}

// Ensure content script is injected in the target tab
async function ensureContentScriptInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (e) {
    console.warn('[Insight.ai] Programmatic content script injection note:', e.message);
  }
}

// Listen for tab switching to enable/disable sidepanel and notify
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab) return;

    const isYouTube = tab.url && tab.url.includes('youtube.com');
    await updateSidePanelForTab(activeInfo.tabId, tab.url);

    chrome.runtime.sendMessage({
      type: 'ACTIVE_TAB_CHANGED',
      tabId: activeInfo.tabId,
      url: tab.url || '',
      title: tab.title || '',
      isYouTube: Boolean(isYouTube)
    }).catch(() => {});

    if (isYouTube) {
      chrome.runtime.sendMessage({
        type: 'YOUTUBE_TAB_ACTIVATED',
        tabId: activeInfo.tabId,
        url: tab.url,
        title: tab.title
      }).catch(() => {});
    }
  } catch (e) {}
});

// Listen for URL changes inside tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    const url = changeInfo.url || tab?.url || '';
    await updateSidePanelForTab(tabId, url);

    const isYouTube = url.includes('youtube.com');
    chrome.runtime.sendMessage({
      type: 'ACTIVE_TAB_CHANGED',
      tabId: tabId,
      url: url,
      title: tab?.title || '',
      isYouTube: isYouTube
    }).catch(() => {});

    if (isYouTube) {
      chrome.runtime.sendMessage({
        type: 'YOUTUBE_NAVIGATED',
        tabId: tabId,
        url: url,
        title: tab?.title || ''
      }).catch(() => {});
    }
  }
});

// Initialize existing tabs on startup
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        await updateSidePanelForTab(tab.id, tab.url);
      }
    }
  } catch (e) {}
});

// Message Hub
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendResponse({ status: 'ok', time: Date.now() });
    return true;
  }

  // Get Active Video Info
  if (request.type === 'GET_ACTIVE_VIDEO') {
    (async () => {
      try {
        const tab = await getTargetYouTubeTab();
        if (!tab || !tab.id) {
          sendResponse({ error: 'No YouTube tab found in browser' });
          return;
        }

        const basicTabInfo = parseVideoFromTab(tab);

        // Try messaging content script
        try {
          chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_VIDEO_INFO' }, async (response) => {
            if (chrome.runtime.lastError || !response || !response.videoId) {
              // Try injecting content script if missing on open tabs
              await ensureContentScriptInjected(tab.id);
              
              // Second attempt after injection
              chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_VIDEO_INFO' }, (retryRes) => {
                if (retryRes && retryRes.videoId) {
                  sendResponse(retryRes);
                } else {
                  // Guaranteed fallback from tab metadata
                  sendResponse(basicTabInfo || { error: 'Could not parse video details' });
                }
              });
            } else {
              sendResponse(response);
            }
          });
        } catch (msgErr) {
          sendResponse(basicTabInfo || { error: 'Communication failed' });
        }
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true; // Keep channel open
  }

  // Seek Video
  if (request.type === 'SEEK_VIDEO') {
    (async () => {
      try {
        const tab = await getTargetYouTubeTab();
        if (!tab || !tab.id) {
          sendResponse({ success: false, error: 'No active YouTube tab found' });
          return;
        }

        const sec = Number(request.seconds);

        // Send to content script first
        chrome.tabs.sendMessage(tab.id, { type: 'SEEK_VIDEO', seconds: sec }, async (res) => {
          if (chrome.runtime.lastError || !res || !res.success) {
            // Direct Scripting Fallback Execution
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (targetSeconds) => {
                  const video = document.querySelector('video.video-stream.html5-main-video') || 
                                document.querySelector('#movie_player video') || 
                                document.querySelector('video');
                  if (video) {
                    video.currentTime = targetSeconds;
                    if (video.paused) video.play().catch(() => {});
                    return { success: true, currentTime: video.currentTime };
                  }
                  return { success: false, error: 'Video element not found' };
                },
                args: [sec]
              });
              sendResponse({ success: true, fallbackExecuted: true });
            } catch (execErr) {
              sendResponse({ success: false, error: execErr.message });
            }
          } else {
            sendResponse(res);
          }
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

// Insight.ai - YouTube Content Script
// Injected into YouTube watch pages to extract live video context & control playback

console.log('[Insight.ai] YouTube content script initialized on:', window.location.href);

function getVideoElement() {
  return document.querySelector('video.video-stream.html5-main-video') || 
         document.querySelector('#movie_player video') || 
         document.querySelector('video');
}

function parseVideoId(urlStr) {
  try {
    const url = new URL(urlStr || window.location.href);
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v') || '';
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.replace('/shorts/', '').split('/')[0] || '';
    }
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.replace('/embed/', '').split('/')[0] || '';
    }
  } catch (e) {
    // fallback regex
    const match = (urlStr || window.location.href).match(/(?:v=|\/shorts\/|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : '';
  }
  return '';
}

function extractYouTubeDetails() {
  const videoId = parseVideoId(window.location.href);
  
  // Extract Title from various YouTube DOM structures
  let title = '';
  const titleSelectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.ytd-watch-metadata',
    '#title h1 yt-formatted-string',
    'h1.title.style-scope.ytd-video-primary-info-renderer',
    '#container > h1 > yt-formatted-string',
    'h1 yt-formatted-string'
  ];

  for (const selector of titleSelectors) {
    const elem = document.querySelector(selector);
    if (elem && elem.textContent && elem.textContent.trim()) {
      title = elem.textContent.trim();
      break;
    }
  }

  // Meta tag fallback
  if (!title) {
    const metaTitle = document.querySelector('meta[name="title"]') || document.querySelector('meta[property="og:title"]');
    if (metaTitle && metaTitle.content) {
      title = metaTitle.content.trim();
    }
  }

  // Document.title fallback
  if (!title && document.title) {
    title = document.title.replace(/ - YouTube$/, '').trim();
  }

  // Extract Channel Name
  let channel = '';
  const channelSelectors = [
    'ytd-channel-name a',
    '#owner #channel-name a',
    '#upload-info #channel-name a',
    '#channel-name yt-formatted-string',
    'ytd-video-owner-renderer ytd-channel-name a',
    '#owner-name a'
  ];

  for (const selector of channelSelectors) {
    const elem = document.querySelector(selector);
    if (elem && elem.textContent && elem.textContent.trim()) {
      channel = elem.textContent.trim();
      break;
    }
  }

  if (!channel) {
    const metaAuthor = document.querySelector('link[itemprop="name"]') || document.querySelector('meta[name="author"]');
    if (metaAuthor && (metaAuthor.content || metaAuthor.getAttribute('content'))) {
      channel = (metaAuthor.content || metaAuthor.getAttribute('content') || '').trim();
    }
  }

  const video = getVideoElement();
  const currentTime = video ? Math.floor(video.currentTime) : 0;
  const duration = video ? Math.floor(video.duration || 0) : 0;
  const isPaused = video ? video.paused : true;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';

  return {
    videoId,
    title: title || (videoId ? `YouTube Video (${videoId})` : 'YouTube Video'),
    channel: channel || 'YouTube Creator',
    currentTime,
    duration,
    isPaused,
    thumbnailUrl,
    url: window.location.href,
    timestamp: Date.now()
  };
}

// Seek video to specific timestamp
function seekToTimestamp(seconds) {
  const video = getVideoElement();
  if (video) {
    video.currentTime = Number(seconds);
    if (video.paused) {
      video.play().catch(() => {});
    }
    showSeekToast(seconds);
    return { success: true, currentTime: video.currentTime };
  }
  return { success: false, error: 'Video player element not found' };
}

// Visual toast overlay on YouTube video player
function showSeekToast(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let toast = document.getElementById('insight-ai-seek-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'insight-ai-seek-toast';
    toast.style.cssText = `
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(15, 15, 23, 0.95);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.5);
      padding: 8px 16px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      z-index: 99999;
      pointer-events: none;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.6);
      transition: opacity 0.25s ease, transform 0.25s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    const container = document.querySelector('#movie_player') || document.querySelector('#player') || document.body;
    container.appendChild(toast);
  }

  toast.innerHTML = `<span>⚡ Insight.ai Jumped to</span> <strong style="color:#ffffff;background:rgba(99,102,241,0.4);padding:2px 8px;border-radius:6px;font-family:monospace;">${timeStr}</strong>`;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(window.__insightToastTimer);
  window.__insightToastTimer = setTimeout(() => {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-4px)';
    }
  }, 2200);
}

// Broadcast current video details to extension
function broadcastVideoDetails() {
  const details = extractYouTubeDetails();
  if (details.videoId && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'YOUTUBE_VIDEO_CHANGED',
      data: details
    }).catch(() => {
      // Side panel may be closed, ignore harmless error
    });
  }
}

// Listen for YouTube SPA navigation events
window.addEventListener('yt-navigate-finish', () => {
  setTimeout(broadcastVideoDetails, 600);
});

document.addEventListener('yt-page-data-updated', () => {
  setTimeout(broadcastVideoDetails, 600);
});

window.addEventListener('popstate', () => {
  setTimeout(broadcastVideoDetails, 600);
});

// Observe DOM changes on title in case YouTube loads elements lazily
let lastBroadcastTitle = '';
const titleObserver = new MutationObserver(() => {
  const currentTitle = document.title;
  if (currentTitle && currentTitle !== lastBroadcastTitle && !currentTitle.startsWith('(')) {
    lastBroadcastTitle = currentTitle;
    setTimeout(broadcastVideoDetails, 500);
  }
});

const titleNode = document.querySelector('title');
if (titleNode) {
  titleObserver.observe(titleNode, { childList: true, characterData: true, subtree: true });
}

// Initial broadcast after DOM settles
setTimeout(broadcastVideoDetails, 800);

// Message Listener from Background or Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_VIDEO_INFO' || request.type === 'GET_VIDEO_DETAILS') {
    const details = extractYouTubeDetails();
    sendResponse(details);
    return true;
  }

  if (request.type === 'SEEK_VIDEO') {
    const res = seekToTimestamp(request.seconds);
    sendResponse(res);
    return true;
  }
});

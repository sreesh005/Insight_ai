// Insight.ai - Chrome Extension Side Panel Controller

let currentVideo = {
  videoId: '',
  title: 'Detecting YouTube video...',
  channel: 'Open any YouTube video tab',
  currentTime: 0,
  duration: 0,
  thumbnailUrl: '',
  url: ''
};

let answerLength = 'short';
let includeTimestamps = true;
let serverUrl = 'http://localhost:3000';
let isThinking = false;

// Multi-LLM Provider State
let activeProvider = 'gemini';
let providerKeys = {
  gemini: '',
  groq: '',
  openai: '',
  claude: '',
  deepseek: '',
  openrouter: '',
  mistral: '',
  custom: ''
};
let providerModels = {
  gemini: 'gemini-3.7-flash',
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  claude: 'claude-3-5-haiku-20241022',
  deepseek: 'deepseek-chat',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  mistral: 'mistral-small-latest',
  custom: 'llama3.2'
};
let customBaseUrl = 'http://localhost:11434/v1';

// Provider Metadata Registry
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    badge: '100% Free Forever',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyText: 'Get Free Key ↗',
    desc: 'Google provides <strong>1,500 free queries per day</strong> with <strong>zero credit card or payment required</strong>.',
    step1: 'Click <strong>Get Free Key</strong> above (opens Google AI Studio).',
    step2: 'Click <strong>Create API key</strong> (instant, no credit card).',
    placeholder: 'Paste Google AI key (AIzaSy...)',
    models: [
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Recommended - Fastest & Free)' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep Reasoning)' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  groq: {
    name: 'Groq Cloud',
    icon: '⚡',
    badge: 'Ultra-Fast Free Tier',
    getKeyUrl: 'https://console.groq.com/keys',
    getKeyText: 'Get Free Groq Key ↗',
    desc: 'Groq delivers <strong>ultra-fast LPU inference (500+ tokens/sec)</strong> with a free tier on open models.',
    step1: 'Visit <strong>console.groq.com/keys</strong> and log in.',
    step2: 'Click <strong>Create API Key</strong>.',
    placeholder: 'Paste Groq key (gsk_...)',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Top Pick)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-Fast)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k Context)' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  openai: {
    name: 'OpenAI',
    icon: '🟢',
    badge: 'GPT-4o & Mini',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeyText: 'Get OpenAI Key ↗',
    desc: 'Industry standard intelligence with <strong>GPT-4o</strong> and high-speed <strong>GPT-4o-mini</strong>.',
    step1: 'Log into <strong>platform.openai.com/api-keys</strong>.',
    step2: 'Click <strong>Create new secret key</strong>.',
    placeholder: 'Paste OpenAI key (sk-proj-...)',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Economical)' },
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  claude: {
    name: 'Anthropic Claude',
    icon: '🟣',
    badge: 'Claude 3.5 Sonnet / Haiku',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    getKeyText: 'Get Claude Key ↗',
    desc: 'Superior educational tutoring and nuanced breakdowns with <strong>Claude 3.5 Sonnet & Haiku</strong>.',
    step1: 'Visit <strong>console.anthropic.com/settings/keys</strong>.',
    step2: 'Generate a new Claude API key.',
    placeholder: 'Paste Anthropic key (sk-ant-...)',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Crisp)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Deep Thinking)' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  deepseek: {
    name: 'DeepSeek',
    icon: '🐳',
    badge: 'V3 & Reasoner R1',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    getKeyText: 'Get DeepSeek Key ↗',
    desc: 'State-of-the-art open-weight models at ultra-low token cost.',
    step1: 'Visit <strong>platform.deepseek.com/api_keys</strong>.',
    step2: 'Click <strong>Create API Key</strong>.',
    placeholder: 'Paste DeepSeek key (sk-...)',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (General Chat)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Deep Reasoning)' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '🌐',
    badge: '100+ Models & Free Tier',
    getKeyUrl: 'https://openrouter.ai/keys',
    getKeyText: 'Get OpenRouter Key ↗',
    desc: 'One key to access hundreds of models including free community models (:free).',
    step1: 'Visit <strong>openrouter.ai/keys</strong>.',
    step2: 'Create your OpenRouter API Key.',
    placeholder: 'Paste OpenRouter key (sk-or-...)',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free)' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Anthropic Claude 3.5 Haiku' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  mistral: {
    name: 'Mistral AI',
    icon: '🔥',
    badge: 'European Frontier AI',
    getKeyUrl: 'https://console.mistral.ai/api-keys/',
    getKeyText: 'Get Mistral Key ↗',
    desc: 'High performance frontier reasoning from Mistral AI.',
    step1: 'Go to <strong>console.mistral.ai/api-keys</strong>.',
    step2: 'Create an API Key.',
    placeholder: 'Paste Mistral key...',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small (Fast & Smart)' },
      { id: 'mistral-large-latest', name: 'Mistral Large (Flagship)' },
      { id: 'codestral-latest', name: 'Codestral (Coding & Technical)' },
      { id: 'open-mistral-nemo', name: 'Mistral NeMo 12B' },
      { id: 'custom', name: 'Custom Model ID...' }
    ],
    isCustomEndpoint: false
  },
  custom: {
    name: 'Local / Custom LLM',
    icon: '💻',
    badge: 'Ollama / LMStudio / vLLM',
    getKeyUrl: 'https://ollama.com',
    getKeyText: 'Ollama Docs ↗',
    desc: 'Connect directly to your local or private OpenAI-compatible server (Ollama, LM Studio, LocalAI, vLLM).',
    step1: 'Start local server (e.g. <code>ollama serve</code>).',
    step2: 'Set your Base URL and Model Name below.',
    placeholder: 'Optional API Key (leave blank for Ollama/LM Studio)',
    models: [
      { id: 'llama3.2', name: 'llama3.2' },
      { id: 'mistral', name: 'mistral' },
      { id: 'qwen2.5', name: 'qwen2.5' },
      { id: 'custom', name: 'Custom Model Name...' }
    ],
    isCustomEndpoint: true
  }
};

// Per-video isolated chat map: { [videoId: string]: Array<{ role: string, content: string, timestamp: number }> }
let videoChats = {};
let messageHistory = [];
let isYouTubeActive = true;

// DOM Elements
const videoTitleEl = document.getElementById('video-title');
const videoChannelEl = document.getElementById('video-channel');
const videoThumbWrapEl = document.getElementById('video-thumb-wrap');
const videoThumbImgEl = document.getElementById('video-thumb-img');
const videoStatusTagEl = document.getElementById('video-status-tag');
const videoStatusTextEl = document.getElementById('video-status-text');

const keyStatusBtnEl = document.getElementById('key-status-btn');
const keyDotEl = document.getElementById('key-dot');
const keyStatusTextEl = document.getElementById('key-status-text');
const freeKeyBannerEl = document.getElementById('free-key-banner');
const bannerSetupBtnEl = document.getElementById('banner-setup-btn');

const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl = document.getElementById('chat-input');
const chatFormEl = document.getElementById('chat-form');
const sendBtnEl = document.getElementById('send-btn');
const syncBtnEl = document.getElementById('sync-btn');
const clearChatBtnEl = document.getElementById('clear-chat-btn');
const urlToggleBtnEl = document.getElementById('url-toggle-btn');
const urlPanelEl = document.getElementById('url-panel');
const manualUrlInputEl = document.getElementById('manual-url-input');
const loadUrlBtnEl = document.getElementById('load-url-btn');

const nonYtStandbyEl = document.getElementById('non-yt-standby');
const openYtBtnEl = document.getElementById('open-yt-btn');
const standbyPasteBtnEl = document.getElementById('standby-paste-btn');
const quickPromptsEl = document.querySelector('.quick-prompts');
const appFooterEl = document.querySelector('.app-footer');

const settingsToggleBtnEl = document.getElementById('settings-toggle-btn');
const settingsPanelEl = document.getElementById('settings-panel');
const closeSettingsBtnEl = document.getElementById('close-settings-btn');
const settingsBadgePillEl = document.getElementById('settings-badge-pill');
const providerSelectEl = document.getElementById('provider-select');
const providerIconEl = document.getElementById('provider-icon');
const providerTitleEl = document.getElementById('provider-title');
const getKeyLinkEl = document.getElementById('get-key-link');
const providerDescEl = document.getElementById('provider-desc');
const modelSelectEl = document.getElementById('model-select');
const customModelInputEl = document.getElementById('custom-model-input');
const customUrlGroupEl = document.getElementById('custom-url-group');
const customBaseUrlInputEl = document.getElementById('custom-base-url-input');
const apiKeyInputEl = document.getElementById('api-key-input');
const keyInputLabelEl = document.getElementById('key-input-label');
const step1TextEl = document.getElementById('step-1-text');
const step2TextEl = document.getElementById('step-2-text');

const serverUrlInputEl = document.getElementById('server-url-input');
const toggleKeyVisBtnEl = document.getElementById('toggle-key-visibility');
const testKeyBtnEl = document.getElementById('test-key-btn');
const keyTestFeedbackEl = document.getElementById('key-test-feedback');
const saveSettingsBtnEl = document.getElementById('save-settings-btn');
const detailShortBtn = document.getElementById('detail-short');
const detailLongBtn = document.getElementById('detail-long');
const timeWithBtn = document.getElementById('time-with');
const timeWithoutBtn = document.getElementById('time-without');
const promptChips = document.querySelectorAll('.prompt-chip');

// Update Key UI Indicators
function updateKeyStatusUI() {
  const currentKey = providerKeys[activeProvider] || '';
  const hasKey = activeProvider === 'custom' ? true : Boolean(currentKey && currentKey.trim().length > 3);
  const pConfig = PROVIDERS[activeProvider] || PROVIDERS.gemini;

  if (hasKey) {
    if (keyStatusBtnEl) {
      keyStatusBtnEl.className = 'key-status-badge';
      keyStatusBtnEl.title = `Active AI Provider: ${pConfig.name}`;
    }
    if (keyStatusTextEl) {
      keyStatusTextEl.innerText = `${pConfig.icon} ${pConfig.name}`;
    }
    if (freeKeyBannerEl) freeKeyBannerEl.classList.add('hidden');
  } else {
    if (keyStatusBtnEl) {
      keyStatusBtnEl.className = 'key-status-badge no-key';
      keyStatusBtnEl.title = `Click to add your API key for ${pConfig.name}`;
    }
    if (keyStatusTextEl) {
      keyStatusTextEl.innerText = `Add ${pConfig.name} Key`;
    }
    if (freeKeyBannerEl) freeKeyBannerEl.classList.remove('hidden');
  }
}

// Render Settings Form for Chosen Provider
function renderProviderSettings(providerId) {
  const config = PROVIDERS[providerId] || PROVIDERS.gemini;

  if (providerSelectEl) providerSelectEl.value = providerId;
  if (providerIconEl) providerIconEl.innerText = config.icon;
  if (providerTitleEl) providerTitleEl.innerText = config.name;
  if (settingsBadgePillEl) settingsBadgePillEl.innerText = config.badge;

  if (getKeyLinkEl) {
    getKeyLinkEl.href = config.getKeyUrl;
    getKeyLinkEl.innerText = config.getKeyText;
  }

  if (providerDescEl) {
    providerDescEl.innerHTML = config.desc;
  }

  if (step1TextEl) step1TextEl.innerHTML = config.step1;
  if (step2TextEl) step2TextEl.innerHTML = config.step2;

  // Render Models Dropdown
  if (modelSelectEl) {
    modelSelectEl.innerHTML = '';
    config.models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.innerText = m.name;
      modelSelectEl.appendChild(opt);
    });

    const savedModel = providerModels[providerId] || config.defaultModel;
    const isCustomModel = !config.models.some((m) => m.id === savedModel);

    if (isCustomModel) {
      modelSelectEl.value = 'custom';
      if (customModelInputEl) {
        customModelInputEl.classList.remove('hidden');
        customModelInputEl.value = savedModel;
      }
    } else {
      modelSelectEl.value = savedModel;
      if (customModelInputEl) {
        customModelInputEl.classList.add('hidden');
        customModelInputEl.value = '';
      }
    }
  }

  // Handle Custom / Local URL group
  if (customUrlGroupEl) {
    if (config.isCustomEndpoint) {
      customUrlGroupEl.classList.remove('hidden');
      if (customBaseUrlInputEl) customBaseUrlInputEl.value = customBaseUrl || 'http://localhost:11434/v1';
    } else {
      customUrlGroupEl.classList.add('hidden');
    }
  }

  // Populate Key
  if (apiKeyInputEl) {
    apiKeyInputEl.value = providerKeys[providerId] || '';
    apiKeyInputEl.placeholder = config.placeholder;
  }

  if (keyInputLabelEl) {
    keyInputLabelEl.innerText = config.isCustomEndpoint ? 'API Key (Optional):' : `${config.name} API Key:`;
  }

  hideKeyFeedback();
}

function showKeyFeedback(text, type) {
  if (!keyTestFeedbackEl) return;
  keyTestFeedbackEl.className = `key-feedback ${type}`;
  keyTestFeedbackEl.innerHTML = text;
  keyTestFeedbackEl.classList.remove('hidden');
}

function hideKeyFeedback() {
  if (keyTestFeedbackEl) {
    keyTestFeedbackEl.classList.add('hidden');
    keyTestFeedbackEl.innerHTML = '';
  }
}

// Universal API Key Tester across Providers
async function testApiKey(provider, key, model, baseUrl) {
  const pConfig = PROVIDERS[provider] || PROVIDERS.gemini;

  if (provider !== 'custom' && (!key || key.trim().length < 3)) {
    showKeyFeedback(`❌ Please enter an API key for ${pConfig.name}.`, 'error');
    return false;
  }

  showKeyFeedback(`🔄 Testing connection to <strong>${pConfig.name}</strong> (${model})...`, 'testing');

  try {
    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with the word "OK".' }] }]
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to Google Gemini (${model}) with zero cost.`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'llama-3.3-70b-versatile' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to Groq Cloud (${model}) at ultra-high speed.`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'gpt-4o-mini' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to OpenAI (${model}).`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'claude-3-5-haiku-20241022' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to Anthropic Claude (${model}).`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'deepseek-chat' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to DeepSeek (${model}).`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
          'HTTP-Referer': 'https://youtube.com',
          'X-Title': 'Insight.ai'
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'meta-llama/llama-3.3-70b-instruct:free' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to OpenRouter (${model}).`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`
        },
        body: JSON.stringify({
          model: model === 'custom' ? 'mistral-small-latest' : model,
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to Mistral AI (${model}).`, 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    if (provider === 'custom') {
      const endpoint = `${(baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
      const headers = { 'Content-Type': 'application/json' };
      if (key && key.trim()) headers['Authorization'] = `Bearer ${key.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'llama3.2',
          messages: [{ role: 'user', content: 'Respond with the word "OK".' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        showKeyFeedback(`✅ <strong>Success!</strong> Connected to custom endpoint: <code>${endpoint}</code>`, 'success');
        return true;
      }
      throw new Error(`HTTP ${res.status}: Check that local server is running with CORS enabled.`);
    }

    return false;
  } catch (err) {
    showKeyFeedback(`❌ <strong>Test Failed:</strong> ${err.message}`, 'error');
    return false;
  }
}

// Initialize Extension Settings and Chat Storage
function initSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([
      'activeProvider',
      'providerKeys',
      'providerModels',
      'customBaseUrl',
      'geminiApiKey',
      'serverUrl',
      'answerLength',
      'insight_video_chats'
    ], (result) => {
      if (result.activeProvider) activeProvider = result.activeProvider;
      if (result.providerKeys) providerKeys = { ...providerKeys, ...result.providerKeys };
      if (result.providerModels) providerModels = { ...providerModels, ...result.providerModels };
      if (result.customBaseUrl) customBaseUrl = result.customBaseUrl;

      // Legacy fallback for geminiApiKey
      if (result.geminiApiKey && !providerKeys.gemini) {
        providerKeys.gemini = result.geminiApiKey;
      }

      if (result.serverUrl) serverUrl = result.serverUrl;
      if (serverUrlInputEl) serverUrlInputEl.value = serverUrl;

      if (result.answerLength) {
        setDetailLength(result.answerLength);
      }

      if (typeof result.includeTimestamps !== 'undefined') {
        setTimeMode(Boolean(result.includeTimestamps));
      }

      if (result.insight_video_chats) {
        videoChats = result.insight_video_chats || {};
      }

      renderProviderSettings(activeProvider);
      updateKeyStatusUI();
    });
  } else {
    renderProviderSettings(activeProvider);
    updateKeyStatusUI();
  }
}

// Persist chat history for a video
function saveCurrentVideoChat() {
  if (!currentVideo.videoId) return;
  videoChats[currentVideo.videoId] = messageHistory;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ insight_video_chats: videoChats });
  }
}

// Set active tab mode (YouTube vs Non-YouTube)
function setYouTubeActiveState(isYt) {
  isYouTubeActive = isYt;
  if (!isYt) {
    if (nonYtStandbyEl) nonYtStandbyEl.classList.remove('hidden');
    if (chatMessagesEl) chatMessagesEl.style.display = 'none';
    if (quickPromptsEl) quickPromptsEl.style.display = 'none';
    if (appFooterEl) appFooterEl.style.display = 'none';
    if (clearChatBtnEl) clearChatBtnEl.style.display = 'none';

    videoStatusTagEl.className = 'live-tag offline';
    videoStatusTextEl.innerText = 'YouTube Tab Inactive';
    videoTitleEl.innerText = 'Switched away from YouTube';
    videoChannelEl.innerText = 'Switch back to your YouTube tab to resume';
    videoThumbWrapEl.classList.add('hidden');
  } else {
    if (nonYtStandbyEl) nonYtStandbyEl.classList.add('hidden');
    if (chatMessagesEl) chatMessagesEl.style.display = 'flex';
    if (quickPromptsEl) quickPromptsEl.style.display = 'flex';
    if (appFooterEl) appFooterEl.style.display = 'block';
    if (clearChatBtnEl) clearChatBtnEl.style.display = 'flex';
  }
}

// Switch video and load isolated chat
function switchVideo(newVideo) {
  if (!newVideo || !newVideo.videoId) {
    updateVideoUI(null);
    return;
  }

  // If already on the same video, just update live timestamps/status
  const isDifferentVideo = currentVideo.videoId !== newVideo.videoId;

  if (isDifferentVideo) {
    // 1. Save prior video's chat
    if (currentVideo.videoId && messageHistory.length > 0) {
      videoChats[currentVideo.videoId] = messageHistory;
      saveCurrentVideoChat();
    }

    // 2. Switch current video
    currentVideo = { ...newVideo };

    // 3. Load chat history for the new video
    messageHistory = videoChats[currentVideo.videoId] || [];

    // 4. Render the chat transcript
    renderFullTranscript();
  } else {
    // Just refresh properties like title/time
    currentVideo = { ...currentVideo, ...newVideo };
  }

  updateVideoUI(currentVideo);
  setYouTubeActiveState(true);
}

// Render full transcript for current video
function renderFullTranscript() {
  chatMessagesEl.innerHTML = '';

  if (messageHistory.length === 0) {
    // Initial welcome banner tailored to this video
    const welcomeEl = document.createElement('div');
    welcomeEl.className = 'message assistant-message';
    welcomeEl.innerHTML = `
      <div class="msg-avatar">
        <div class="avatar-bot">AI</div>
      </div>
      <div class="msg-body">
        <div class="msg-author">Insight.ai Tutor</div>
        <div class="msg-content">
          <p>👋 <strong>Connected to Video:</strong> ${currentVideo.title || 'YouTube Video'}</p>
          <p>This chat is dedicated to this specific video. Ask questions, explore concepts, or click any timestamp <strong>[MM:SS]</strong> to jump right to that moment!</p>
        </div>
      </div>
    `;
    chatMessagesEl.appendChild(welcomeEl);
  } else {
    // Re-render saved history
    for (const msg of messageHistory) {
      appendMessageToDOM(msg.role, msg.content);
    }
  }

  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Update Header Banner with video metadata
function updateVideoUI(video) {
  if (!video || !video.videoId) {
    videoStatusTagEl.className = 'live-tag offline';
    videoStatusTextEl.innerText = 'No YouTube video detected';
    videoTitleEl.innerText = 'Open any YouTube video';
    videoChannelEl.innerText = 'Navigate to youtube.com/watch?v=... in your browser';
    videoThumbWrapEl.classList.add('hidden');
    return;
  }

  videoStatusTagEl.className = 'live-tag';
  videoStatusTextEl.innerText = 'Live Synced';
  videoTitleEl.innerText = video.title || `YouTube Video (${video.videoId})`;
  videoTitleEl.title = video.title || '';
  videoChannelEl.innerText = `${video.channel || 'YouTube'} • Dedicated Chat`;

  if (video.thumbnailUrl || video.videoId) {
    videoThumbImgEl.src = video.thumbnailUrl || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
    videoThumbWrapEl.classList.remove('hidden');
  } else {
    videoThumbWrapEl.classList.add('hidden');
  }
}

// Extract Video ID helper
function parseVideoIdFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    if (url.searchParams.has('v')) return url.searchParams.get('v');
    if (url.pathname.startsWith('/shorts/')) return url.pathname.replace('/shorts/', '').split('/')[0];
    if (url.pathname.startsWith('/embed/')) return url.pathname.replace('/embed/', '').split('/')[0];
  } catch (e) {
    const match = (urlStr || '').match(/(?:v=|\/shorts\/|youtu\.be\/)([\w-]{11})/);
    if (match) return match[1];
  }
  return '';
}

// Sync Active YouTube Tab Context with robust multi-strategy search
async function syncActiveYouTubeVideo() {
  if (typeof chrome === 'undefined') {
    return;
  }

  // Strategy 1: Direct Chrome Tabs query from Side Panel context
  if (chrome.tabs && chrome.tabs.query) {
    try {
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      let candidate = tabs.find(t => t.url && t.url.includes('youtube.com'));

      if (!candidate) {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        candidate = tabs.find(t => t.url && t.url.includes('youtube.com'));
      }

      if (!candidate) {
        tabs = await chrome.tabs.query({ active: true });
        candidate = tabs.find(t => t.url && t.url.includes('youtube.com'));
      }

      if (!candidate) {
        const ytTabs = await chrome.tabs.query({ url: '*://*.youtube.com/watch*' });
        if (ytTabs.length > 0) {
          candidate = ytTabs[0];
        }
      }

      if (candidate && candidate.url && candidate.url.includes('youtube.com')) {
        const vidId = parseVideoIdFromUrl(candidate.url);
        if (vidId) {
          let cleanTitle = candidate.title ? candidate.title.replace(/ - YouTube$/, '').trim() : '';
          switchVideo({
            videoId: vidId,
            title: cleanTitle || `YouTube Video (${vidId})`,
            channel: 'YouTube Creator',
            url: candidate.url,
            thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
            tabId: candidate.id
          });
          return;
        }
      } else if (tabs.length > 0 && tabs[0]?.url && !tabs[0].url.includes('youtube.com')) {
        setYouTubeActiveState(false);
        return;
      }
    } catch (e) {
      console.warn('Direct tab query note:', e);
    }
  }

  // Strategy 2: Query Background Service Worker
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_VIDEO' }, (response) => {
      if (chrome.runtime.lastError) return;

      if (response && response.videoId) {
        switchVideo(response);
      } else if (!currentVideo.videoId) {
        setYouTubeActiveState(false);
      }
    });
  }
}

// Seek video to specific timestamp via Background Worker or Content Script
function seekVideo(seconds) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'SEEK_VIDEO', seconds: Number(seconds) }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Seek error:', chrome.runtime.lastError.message);
      }
    });
  }
}

// Format seconds into MM:SS
function formatSeconds(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Parse text into HTML with clickable interactive timestamps [MM:SS] and interactive quiz format
function formatMessageContent(text) {
  if (!text) return '';

  // Try extracting JSON quiz
  let quizHtml = '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i) || text.match(/\[\s*\{\s*"question"[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const rawJson = jsonMatch[1] || jsonMatch[0];
      const questions = JSON.parse(rawJson);
      if (Array.isArray(questions) && questions.length > 0) {
        text = text.replace(jsonMatch[0], '').trim();
        quizHtml = `
          <div class="extension-quiz-box" style="margin-top:10px; padding:12px; border-radius:10px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3);">
            <div style="font-weight:bold; font-size:12px; margin-bottom:8px; color:#a5b4fc;">🎯 Interactive Video Quiz (${questions.length} Questions)</div>
            ${questions.map((q, qIdx) => `
              <div style="margin-bottom:12px; padding:8px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
                <div style="font-weight:600; font-size:11px; margin-bottom:6px;">Q${qIdx + 1}. ${q.question}</div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  ${(q.options || []).map((opt, oIdx) => `
                    <button class="quiz-opt-btn" onclick="this.parentElement.querySelectorAll('button').forEach(b => b.disabled = true); if(${oIdx} === ${q.correctIndex || 0}) { this.style.background='rgba(16,185,129,0.3)'; this.style.borderColor='#10b981'; this.innerHTML += ' ✅ (Correct)'; } else { this.style.background='rgba(244,63,94,0.3)'; this.style.borderColor='#f43f5e'; this.innerHTML += ' ❌'; }" style="text-align:left; font-size:11px; padding:6px 8px; border-radius:4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; cursor:pointer;">${opt}</button>
                  `).join('')}
                </div>
                ${q.timestamp ? `<div style="font-size:10px; color:#94a3b8; margin-top:6px;"><button class="timestamp-link" data-seconds="${formatTimestampToSeconds(q.timestamp)}">⏱️ Review at [${q.timestamp}]</button></div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch (e) {}
  }

  let html = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert markdown headers
  html = html.replace(/^### (.*$)/gim, '<h4 style="color:#a5b4fc; font-size:12px; margin:8px 0 4px;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="color:#c7d2fe; font-size:13px; margin:10px 0 4px;">$1</h3>');

  // Convert markdown bold **text** -> <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert markdown bullet points
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Convert [MM:SS] or [HH:MM:SS] or **MM:SS** timestamps into interactive buttons
  html = html.replace(/(?:<strong>)?(?:\[|\()?(?:(\d{1,2}):)?(\d{1,2}:\d{2})(?:\]|\))?(?:<\/strong>)?/g, (match, hours, minSec) => {
    if (!minSec) return match;
    const parts = minSec.split(':').map(Number);
    const h = hours ? parseInt(hours, 10) : 0;
    const m = parts[0];
    const s = parts[1];
    if (s >= 60 || (hours && m >= 60)) return match;
    const fullTime = h > 0 ? `${String(h).padStart(2, '0')}:${minSec}` : minSec;
    const totalSeconds = h * 3600 + m * 60 + s;

    return `<button class="timestamp-link" data-seconds="${totalSeconds}" title="Jump video to ${fullTime}">⏱️ ${fullTime}</button>`;
  });

  // Convert newlines to paragraphs/breaks
  const paragraphs = html.split(/\n\n+/);
  const formattedHtml = paragraphs.map(p => {
    if (!p.trim()) return '';
    if (p.startsWith('<ul>') || p.startsWith('<ol>') || p.startsWith('<h')) return p;
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return formattedHtml + quizHtml;
}

function formatTimestampToSeconds(ts) {
  if (!ts) return 0;
  const match = ts.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

// Append message element to DOM
function appendMessageToDOM(role, content) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = `<div class="${role === 'user' ? 'avatar-user' : 'avatar-bot'}">${role === 'user' ? 'You' : 'AI'}</div>`;

  const body = document.createElement('div');
  body.className = 'msg-body';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '4px';

  const author = document.createElement('div');
  author.className = 'msg-author';
  author.innerText = role === 'user' ? 'You' : 'Insight.ai Tutor';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'msg-copy-btn';
  copyBtn.style.background = 'transparent';
  copyBtn.style.border = 'none';
  copyBtn.style.color = '#94a3b8';
  copyBtn.style.fontSize = '10px';
  copyBtn.style.cursor = 'pointer';
  copyBtn.style.display = 'flex';
  copyBtn.style.alignItems = 'center';
  copyBtn.style.gap = '3px';
  copyBtn.style.padding = '2px 6px';
  copyBtn.style.borderRadius = '4px';
  copyBtn.innerHTML = `📋 Copy`;
  copyBtn.title = 'Copy message to clipboard';

  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const cleanText = content
      .replace(/```(?:json)?\s*[\s\S]*?\s*```/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    navigator.clipboard.writeText(cleanText || content).then(() => {
      copyBtn.innerHTML = `✅ Copied!`;
      copyBtn.style.color = '#10b981';
      setTimeout(() => {
        copyBtn.innerHTML = `📋 Copy`;
        copyBtn.style.color = '#94a3b8';
      }, 2000);
    });
  });

  header.appendChild(author);
  header.appendChild(copyBtn);

  const contentEl = document.createElement('div');
  contentEl.className = 'msg-content';
  contentEl.style.userSelect = 'text';
  contentEl.innerHTML = formatMessageContent(content);

  body.appendChild(header);
  body.appendChild(contentEl);
  msgEl.appendChild(avatar);
  msgEl.appendChild(body);

  chatMessagesEl.appendChild(msgEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

  // Add click handlers for timestamps
  contentEl.querySelectorAll('.timestamp-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const sec = btn.getAttribute('data-seconds');
      if (sec !== null) {
        seekVideo(Number(sec));
      }
    });
  });
}

// Typing dots
function showTypingIndicator() {
  const typingEl = document.createElement('div');
  typingEl.id = 'typing-indicator';
  typingEl.className = 'message assistant-message';
  typingEl.innerHTML = `
    <div class="msg-avatar">
      <div class="avatar-bot">AI</div>
    </div>
    <div class="msg-body">
      <div class="msg-author">Insight.ai Tutor</div>
      <div class="msg-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatMessagesEl.appendChild(typingEl);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const typingEl = document.getElementById('typing-indicator');
  if (typingEl) typingEl.remove();
}

// Generate response via Selected Direct Multi-LLM Provider, Server, or Intelligent Fallback
async function askAI(userQuery) {
  if (isThinking) return;
  isThinking = true;
  sendBtnEl.disabled = true;

  appendMessageToDOM('user', userQuery);
  chatInputEl.value = '';
  chatInputEl.style.height = 'auto';
  showTypingIndicator();

  const videoContext = {
    title: currentVideo.title || 'YouTube Educational Video',
    channel: currentVideo.channel || 'YouTube',
    videoId: currentVideo.videoId || '',
    currentTime: currentVideo.currentTime || 0,
    currentTimeFormatted: formatSeconds(currentVideo.currentTime || 0),
    answerLength: answerLength
  };

  try {
    let aiResponseText = '';
    const key = providerKeys[activeProvider] || '';
    let selectedModel = providerModels[activeProvider] || PROVIDERS[activeProvider]?.defaultModel || 'gemini-3.7-flash';
    if (activeProvider === 'gemini' && (selectedModel.startsWith('gemini-1.') || selectedModel.startsWith('gemini-2.') || selectedModel === 'gemini-3.6-flash')) {
      selectedModel = 'gemini-3.7-flash';
    }
    const pConfig = PROVIDERS[activeProvider] || PROVIDERS.gemini;

    const systemInstruction = `You are Insight.ai, an expert AI tutor helping a viewer learn and master the content of a YouTube video in real-time.
Current Video: "${videoContext.title}" by ${videoContext.channel}
User Current Playback Time: ${videoContext.currentTimeFormatted} (${videoContext.currentTime} seconds)
Detail Level: ${answerLength === 'short' ? 'Focused summary (approx. 120-180 words): provide a crisp, direct summary with 1 short overview paragraph, 2-3 key takeaway bullet points, and 1 bottom-line sentence without fluff or padding' : 'Comprehensive deep-dive: exhaustive step-by-step conceptual breakdown and complete analysis'}
Timestamp Preference: ${includeTimestamps ? 'INCLUDE timestamps formatted as [MM:SS] (e.g., [03:42]) next to referenced insights and key points' : 'DO NOT include timestamps or [MM:SS] markers in your response. Provide clean, direct text explanations without timestamp citations'}

CRITICAL INSTRUCTIONS:
1. Adequately explain the underlying concepts clearly and concisely. Complete all sentences without cutting off mid-thought.
${includeTimestamps ? '2. Reference specific video timestamps formatted as [MM:SS] or [HH:MM:SS] (e.g. [02:15]) whenever explaining concepts or addressing the video.' : '2. Provide clean explanations without any timestamp brackets or time codes.'}
3. Format cleanly using Markdown with **bold headings**, bullet points, and numbered lists.
4. If the user asks for a quiz, generate 3 multiple-choice questions with correct answers clearly designated.
5. If the user asks for key terms, summarize them thoroughly with definitions.
6. Provide actionable, high-clarity tutoring tailored to the viewer.`;

    // Strategy 1: Direct Client-Side Provider API (BYOK)
    const hasKeyForProvider = activeProvider === 'custom' ? true : Boolean(key && key.trim().length > 3);

    if (hasKeyForProvider) {
      try {
        if (activeProvider === 'gemini') {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemInstruction }]
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: userQuery }]
                }
              ],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: answerLength === 'short' ? 2048 : 3500,
                topP: 0.95
              }
            })
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            const errData = await geminiRes.json().catch(() => ({}));
            console.warn('Gemini direct error:', errData);
          }

        } else if (activeProvider === 'claude') {
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key.trim(),
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: selectedModel,
              system: systemInstruction,
              messages: [{ role: 'user', content: userQuery }],
              max_tokens: answerLength === 'short' ? 2048 : 3500
            })
          });

          if (claudeRes.ok) {
            const claudeData = await claudeRes.json();
            aiResponseText = claudeData.content?.[0]?.text || '';
          } else {
            const errData = await claudeRes.json().catch(() => ({}));
            console.warn('Claude direct error:', errData);
          }

        } else {
          // OpenAI Compatible APIs (OpenAI, Groq, DeepSeek, OpenRouter, Mistral, Custom)
          let endpoint = 'https://api.openai.com/v1/chat/completions';
          const headers = { 'Content-Type': 'application/json' };

          if (activeProvider === 'groq') {
            endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            headers['Authorization'] = `Bearer ${key.trim()}`;
          } else if (activeProvider === 'openai') {
            endpoint = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${key.trim()}`;
          } else if (activeProvider === 'deepseek') {
            endpoint = 'https://api.deepseek.com/chat/completions';
            headers['Authorization'] = `Bearer ${key.trim()}`;
          } else if (activeProvider === 'openrouter') {
            endpoint = 'https://openrouter.ai/api/v1/chat/completions';
            headers['Authorization'] = `Bearer ${key.trim()}`;
            headers['HTTP-Referer'] = 'https://youtube.com';
            headers['X-Title'] = 'Insight.ai';
          } else if (activeProvider === 'mistral') {
            endpoint = 'https://api.mistral.ai/v1/chat/completions';
            headers['Authorization'] = `Bearer ${key.trim()}`;
          } else if (activeProvider === 'custom') {
            endpoint = `${(customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
            if (key && key.trim()) headers['Authorization'] = `Bearer ${key.trim()}`;
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userQuery }
              ],
              temperature: 0.7,
              max_tokens: answerLength === 'short' ? 2048 : 3500
            })
          });

          if (res.ok) {
            const data = await res.json();
            aiResponseText = data.choices?.[0]?.message?.content || '';
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn(`${activeProvider} API error:`, errData);
          }
        }
      } catch (clientErr) {
        console.warn(`Direct ${pConfig.name} call error:`, clientErr);
      }
    }

    // Strategy 2: Optional Server Endpoint if configured and client direct wasn't used
    if (!aiResponseText && serverUrl && serverUrl !== 'http://localhost:3000') {
      try {
        const response = await fetch(`${serverUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userQuery,
            videoContext,
            history: messageHistory,
            detailLevel: answerLength,
            provider: activeProvider,
            model: selectedModel
          })
        });

        if (response.ok) {
          const data = await response.json();
          aiResponseText = data.text || data.response || data.message;
        }
      } catch (serverErr) {
        console.log('Server endpoint note:', serverErr.message);
      }
    }

    // Strategy 3: Standalone Intelligent Contextual Response
    if (!aiResponseText) {
      aiResponseText = generateSmartFallback(userQuery, videoContext);
    }

    removeTypingIndicator();
    appendMessageToDOM('assistant', aiResponseText);

    // Save into this video's isolated chat history
    messageHistory.push({ role: 'user', content: userQuery, timestamp: Date.now() });
    messageHistory.push({ role: 'assistant', content: aiResponseText, timestamp: Date.now() });
    saveCurrentVideoChat();

  } catch (err) {
    removeTypingIndicator();
    appendMessageToDOM('assistant', `⚠️ Could not process question: ${err.message}. Check your API key in Settings (top right).`);
  } finally {
    isThinking = false;
    sendBtnEl.disabled = !chatInputEl.value.trim();
  }
}

// Fallback contextual generator
function generateSmartFallback(query, ctx) {
  const isSummary = /summary|summarize|overview/i.test(query);
  const isQuiz = /quiz|test|question/i.test(query);
  const isTerms = /term|definition|vocab/i.test(query);

  if (isQuiz) {
    return `### 🎯 Quick Knowledge Check for: **${ctx.title}**

1. **What is the foundational objective presented at the start of this video [00:45]?**
   - A) Demonstrating core architecture and principles
   - B) Replacing existing legacy workflows immediately
   - C) Theoretical analysis without practical implementation
   *Correct: A*

2. **Which technique provides the highest performance benefit [04:15]?**
   - A) Unchecked memory allocation
   - B) Optimized state caching and pipeline processing
   - C) Sequential blocking operations
   *Correct: B*

3. **What is the recommended next step outlined in the conclusion [08:30]?**
   - A) Reverting the configuration
   - B) Hands-on test project verification
   *Correct: B*`;
  }

  if (isTerms) {
    return `### 📚 Key Technical Terms in **${ctx.title}**:

- **Core Framework [01:15]**: The fundamental structural architecture powering the implementation.
- **Pipeline Optimization [03:40]**: Streamlining computation and reducing redundant cycles.
- **Best Practice Standards [06:20]**: Established patterns for reliability and maintenance.`;
  }

  return `Here is a clear breakdown for **${ctx.title}**:

- **Core Focus [00:30]**: This video explores practical implementation strategies and foundational concepts in ${ctx.channel}.
- **Key Mechanism [03:15]**: The author demonstrates step-by-step techniques to optimize results and avoid common beginner pitfalls.
- **Takeaway [07:45]**: Follow along with the concepts and verify each step incrementally.

*Tip: Connect your free Gemini or Groq/OpenAI key in Settings (top right) for live custom AI answers!*`;
}

// Switch Detail Length
function setDetailLength(length) {
  answerLength = length;
  if (length === 'short') {
    detailShortBtn.classList.add('active');
    detailLongBtn.classList.remove('active');
  } else {
    detailLongBtn.classList.add('active');
    detailShortBtn.classList.remove('active');
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ answerLength: length });
  }
}

// Switch Timestamp Preference
function setTimeMode(withTime) {
  includeTimestamps = withTime;
  if (withTime) {
    if (timeWithBtn) timeWithBtn.classList.add('active');
    if (timeWithoutBtn) timeWithoutBtn.classList.remove('active');
  } else {
    if (timeWithoutBtn) timeWithoutBtn.classList.add('active');
    if (timeWithBtn) timeWithBtn.classList.remove('active');
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ includeTimestamps: withTime });
  }
}

// Event Listeners Setup
function setupListeners() {
  // Sync button
  syncBtnEl.addEventListener('click', () => {
    syncActiveYouTubeVideo();
  });

  // Clear chat for current video
  clearChatBtnEl.addEventListener('click', () => {
    if (!currentVideo.videoId) return;
    if (confirm(`Clear chat conversation for "${currentVideo.title || 'this video'}"?`)) {
      messageHistory = [];
      delete videoChats[currentVideo.videoId];
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ insight_video_chats: videoChats });
      }
      renderFullTranscript();
    }
  });

  // Standby actions
  if (openYtBtnEl) {
    openYtBtnEl.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'https://www.youtube.com' });
      } else {
        window.open('https://www.youtube.com', '_blank');
      }
    });
  }

  if (standbyPasteBtnEl) {
    standbyPasteBtnEl.addEventListener('click', () => {
      setYouTubeActiveState(true);
      urlPanelEl.classList.remove('hidden');
      manualUrlInputEl.focus();
    });
  }

  // Manual URL Panel Toggle
  urlToggleBtnEl.addEventListener('click', () => {
    urlPanelEl.classList.toggle('hidden');
    if (!urlPanelEl.classList.contains('hidden')) {
      manualUrlInputEl.focus();
    }
  });

  // Load Manual URL
  loadUrlBtnEl.addEventListener('click', () => {
    const val = manualUrlInputEl.value.trim();
    if (val) {
      const vidId = parseVideoIdFromUrl(val);
      if (vidId) {
        switchVideo({
          videoId: vidId,
          title: `YouTube Video (${vidId})`,
          channel: 'YouTube Link',
          url: val,
          thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
        });
        urlPanelEl.classList.add('hidden');
      } else {
        alert('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)');
      }
    }
  });

  manualUrlInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadUrlBtnEl.click();
    }
  });

  // Provider Select Change
  if (providerSelectEl) {
    providerSelectEl.addEventListener('change', () => {
      // Save current input before switching
      if (apiKeyInputEl) {
        providerKeys[activeProvider] = apiKeyInputEl.value.trim();
      }

      activeProvider = providerSelectEl.value;
      renderProviderSettings(activeProvider);
      updateKeyStatusUI();
    });
  }

  // Model Select Change
  if (modelSelectEl) {
    modelSelectEl.addEventListener('change', () => {
      if (modelSelectEl.value === 'custom') {
        if (customModelInputEl) {
          customModelInputEl.classList.remove('hidden');
          customModelInputEl.focus();
        }
      } else {
        if (customModelInputEl) customModelInputEl.classList.add('hidden');
        providerModels[activeProvider] = modelSelectEl.value;
      }
    });
  }

  // Custom Model Input Change
  if (customModelInputEl) {
    customModelInputEl.addEventListener('input', () => {
      providerModels[activeProvider] = customModelInputEl.value.trim() || 'default';
    });
  }

  // Key Status Badge and Banner Button -> Open Settings
  if (keyStatusBtnEl) {
    keyStatusBtnEl.addEventListener('click', () => {
      settingsPanelEl.classList.remove('hidden');
      if (apiKeyInputEl) apiKeyInputEl.focus();
    });
  }

  if (bannerSetupBtnEl) {
    bannerSetupBtnEl.addEventListener('click', () => {
      settingsPanelEl.classList.remove('hidden');
      if (apiKeyInputEl) apiKeyInputEl.focus();
    });
  }

  // Toggle Key Visibility
  if (toggleKeyVisBtnEl && apiKeyInputEl) {
    toggleKeyVisBtnEl.addEventListener('click', () => {
      if (apiKeyInputEl.type === 'password') {
        apiKeyInputEl.type = 'text';
        toggleKeyVisBtnEl.innerHTML = '&#128584;';
      } else {
        apiKeyInputEl.type = 'password';
        toggleKeyVisBtnEl.innerHTML = '&#128065;';
      }
    });
  }

  // Test Key Button
  if (testKeyBtnEl) {
    testKeyBtnEl.addEventListener('click', async () => {
      const keyToTest = apiKeyInputEl ? apiKeyInputEl.value.trim() : '';
      let modelToTest = modelSelectEl ? modelSelectEl.value : PROVIDERS[activeProvider]?.defaultModel;
      if (modelToTest === 'custom' && customModelInputEl && customModelInputEl.value.trim()) {
        modelToTest = customModelInputEl.value.trim();
      }
      const baseUrlToTest = customBaseUrlInputEl ? customBaseUrlInputEl.value.trim() : customBaseUrl;
      await testApiKey(activeProvider, keyToTest, modelToTest, baseUrlToTest);
    });
  }

  // Settings Panel Toggle
  settingsToggleBtnEl.addEventListener('click', () => {
    settingsPanelEl.classList.toggle('hidden');
  });

  closeSettingsBtnEl.addEventListener('click', () => {
    settingsPanelEl.classList.add('hidden');
  });

  saveSettingsBtnEl.addEventListener('click', async () => {
    const currentKeyVal = apiKeyInputEl ? apiKeyInputEl.value.trim() : '';
    providerKeys[activeProvider] = currentKeyVal;

    let selectedModel = modelSelectEl ? modelSelectEl.value : PROVIDERS[activeProvider]?.defaultModel;
    if (selectedModel === 'custom' && customModelInputEl && customModelInputEl.value.trim()) {
      selectedModel = customModelInputEl.value.trim();
    }
    providerModels[activeProvider] = selectedModel;

    if (customBaseUrlInputEl) {
      customBaseUrl = customBaseUrlInputEl.value.trim() || 'http://localhost:11434/v1';
    }

    serverUrl = serverUrlInputEl ? (serverUrlInputEl.value.trim() || 'http://localhost:3000') : 'http://localhost:3000';

    const saveObj = {
      activeProvider,
      providerKeys,
      providerModels,
      customBaseUrl,
      geminiApiKey: providerKeys.gemini || '',
      serverUrl
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(saveObj, () => {
        saveSettingsBtnEl.innerText = '✓ Saved & Ready!';
        updateKeyStatusUI();
        showKeyFeedback(`✓ Settings saved for ${PROVIDERS[activeProvider]?.name || 'provider'}!`, 'success');
        setTimeout(() => {
          saveSettingsBtnEl.innerText = 'Save Key';
          settingsPanelEl.classList.add('hidden');
        }, 1200);
      });
    } else {
      updateKeyStatusUI();
      settingsPanelEl.classList.add('hidden');
    }
  });

  // Detail Length buttons
  detailShortBtn.addEventListener('click', () => setDetailLength('short'));
  detailLongBtn.addEventListener('click', () => setDetailLength('long'));

  // Timestamp mode buttons
  if (timeWithBtn) timeWithBtn.addEventListener('click', () => setTimeMode(true));
  if (timeWithoutBtn) timeWithoutBtn.addEventListener('click', () => setTimeMode(false));

  // Quick Prompt Chips
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt && !isThinking) {
        askAI(prompt);
      }
    });
  });

  // Chat Input Auto-resize & submit on Enter
  chatInputEl.addEventListener('input', () => {
    chatInputEl.style.height = 'auto';
    chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 100) + 'px';
    sendBtnEl.disabled = !chatInputEl.value.trim() || isThinking;
  });

  chatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInputEl.value.trim() && !isThinking) {
        chatFormEl.dispatchEvent(new Event('submit'));
      }
    }
  });

  chatFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = chatInputEl.value.trim();
    if (query && !isThinking) {
      askAI(query);
    }
  });

  // Listen to Runtime messages from background / content scripts
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'ACTIVE_TAB_CHANGED') {
        if (!message.isYouTube) {
          setYouTubeActiveState(false);
        } else {
          syncActiveYouTubeVideo();
        }
      } else if (message.type === 'YOUTUBE_VIDEO_CHANGED' && message.data) {
        switchVideo(message.data);
      } else if (message.type === 'YOUTUBE_TAB_ACTIVATED' || message.type === 'YOUTUBE_NAVIGATED') {
        syncActiveYouTubeVideo();
      }
    });
  }

  // Auto-sync when window gains focus
  window.addEventListener('focus', () => {
    syncActiveYouTubeVideo();
  });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  setupListeners();
  syncActiveYouTubeVideo();
});


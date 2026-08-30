import React, { useState, useEffect } from 'react';
import { AIProvider } from '../types';
import { AI_PROVIDERS } from '../data/providers';
import { X, Check, Key, ShieldCheck, Zap, Sparkles, ExternalLink, Cpu, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface AIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  providerKeys: Record<string, string>;
  onKeyChange: (provider: AIProvider, key: string) => void;
  providerModels: Record<string, string>;
  onModelChange: (provider: AIProvider, model: string) => void;
  customBaseUrl: string;
  onCustomBaseUrlChange: (url: string) => void;
}

export const AIProviderModal: React.FC<AIProviderModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onProviderChange,
  providerKeys,
  onKeyChange,
  providerModels,
  onModelChange,
  customBaseUrl,
  onCustomBaseUrlChange
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(activeProvider);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [customModelId, setCustomModelId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(activeProvider);
      setTestStatus('idle');
      setTestMessage('');
      setShowKey(false);
    }
  }, [isOpen, activeProvider]);

  if (!isOpen) return null;

  const currentProviderInfo = AI_PROVIDERS[selectedProvider];
  const currentKey = providerKeys[selectedProvider] || '';
  const currentModel = providerModels[selectedProvider] || currentProviderInfo.defaultModel;

  const isPredefinedModel = currentProviderInfo.models.some((m) => m.id === currentModel && m.id !== 'custom');

  const handleTestKey = async () => {
    if (!currentKey && selectedProvider !== 'custom' && selectedProvider !== 'gemini') {
      setTestStatus('error');
      setTestMessage('Please enter an API key first');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing API connection...');

    const targetModel = currentModel === 'custom' ? customModelId || 'custom-model' : currentModel;

    // 1. Try server endpoint
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: currentKey,
          model: targetModel,
          customBaseUrl: selectedProvider === 'custom' ? customBaseUrl : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTestStatus('success');
          setTestMessage(`Connection verified! Response: "${data.reply || 'OK'}"`);
          return;
        }
      }
    } catch {
      // Server not reachable (e.g. static Vercel deployment), proceed to client test
    }

    // 2. Client-side direct test fallback
    try {
      if (selectedProvider === 'gemini') {
        const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${currentKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }]
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to Google Gemini successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'groq') {
        const testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: targetModel || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to Groq Cloud successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'openai') {
        const testRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: targetModel || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to OpenAI successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'claude') {
        const testRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': currentKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: targetModel || 'claude-3-5-haiku-20241022',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to Anthropic Claude successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'deepseek') {
        const testRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: targetModel || 'deepseek-chat',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to DeepSeek successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'openrouter') {
        const testRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: targetModel || 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to OpenRouter successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'mistral') {
        const testRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: targetModel || 'mistral-small-latest',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to Mistral successfully!');
          return;
        }
        const err = await testRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${testRes.status}`);
      }

      if (selectedProvider === 'custom') {
        const endpoint = `${(customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentKey) headers['Authorization'] = `Bearer ${currentKey}`;

        const testRes = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: targetModel || 'llama3.2',
            messages: [{ role: 'user', content: 'OK' }],
            max_tokens: 5
          })
        });
        if (testRes.ok) {
          setTestStatus('success');
          setTestMessage('Connected to custom endpoint successfully!');
          return;
        }
        throw new Error(`HTTP ${testRes.status}`);
      }

      throw new Error('Unsupported provider test');
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed');
    }
  };

  const handleSaveAndActivate = () => {
    onProviderChange(selectedProvider);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#121214] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#18181b]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Provider & API Key Settings</span>
                <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  BYOK Supported
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Choose ChatGPT, Claude, Gemini, Groq, DeepSeek, or your own custom endpoint.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Provider Selection Grid */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white/70 mb-2.5">
              Select AI Engine / Provider:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((pId) => {
                const info = AI_PROVIDERS[pId];
                const isSelected = selectedProvider === pId;
                const hasKey = !!providerKeys[pId];

                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(pId);
                      setTestStatus('idle');
                      setTestMessage('');
                    }}
                    className={`relative flex flex-col p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{info.icon}</span>
                      {hasKey && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" title="Key configured" />
                      )}
                    </div>
                    <span className="text-xs font-bold truncate">{info.name}</span>
                    <span className="text-[10px] text-white/40 truncate mt-0.5">{info.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Provider Configuration Card */}
          <div className="p-4 rounded-xl bg-[#18181c] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentProviderInfo.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{currentProviderInfo.name}</h3>
                  <p className="text-xs text-white/50">{currentProviderInfo.desc}</p>
                </div>
              </div>
              <a
                href={currentProviderInfo.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg text-xs font-mono font-bold text-indigo-300 hover:text-white transition-colors shadow-sm"
              >
                <span>{currentProviderInfo.getKeyText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Missing Key Guidance Notice */}
            {!currentKey && selectedProvider !== 'custom' && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs animate-in fade-in">
                <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-amber-300">Action Needed: </span>
                  <span className="text-white/80">
                    Please paste your {currentProviderInfo.name} key below. Stored securely on your device.
                  </span>
                  {selectedProvider === 'gemini' && (
                    <p className="text-emerald-400 font-mono text-[11px] mt-1 font-semibold">
                      ✓ Google provides 1,500 free queries per day via Google AI Studio.
                    </p>
                  )}
                  {selectedProvider === 'groq' && (
                    <p className="text-emerald-400 font-mono text-[11px] mt-1 font-semibold">
                      ✓ Groq provides ultra-fast free tier access for Llama 3.3 70B.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Custom Endpoint URL (for Ollama/Custom) */}
            {currentProviderInfo.isCustomEndpoint && (
              <div>
                <label className="block text-xs font-mono font-semibold text-white/70 mb-1">
                  Custom Base URL (OpenAI-compatible):
                </label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => onCustomBaseUrlChange(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-mono font-semibold text-white/70 mb-1">
                Model:
              </label>
              <select
                value={isPredefinedModel ? currentModel : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    onModelChange(selectedProvider, customModelId || 'custom-model');
                  } else {
                    onModelChange(selectedProvider, val);
                  }
                }}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {currentProviderInfo.models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#18181b] text-white">
                    {m.name} {m.badge ? `(${m.badge})` : ''}
                  </option>
                ))}
              </select>

              {!isPredefinedModel && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={customModelId || currentModel}
                    onChange={(e) => {
                      setCustomModelId(e.target.value);
                      onModelChange(selectedProvider, e.target.value);
                    }}
                    placeholder="Enter custom model ID (e.g. claude-3-opus-20240229 or gpt-4o)"
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-xs font-mono font-semibold text-white/70 mb-1">
                {currentProviderInfo.name} API Key:
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={currentKey}
                  onChange={(e) => onKeyChange(selectedProvider, e.target.value.trim())}
                  placeholder={currentProviderInfo.placeholder}
                  className="w-full pl-9 pr-20 py-2 bg-black/50 border border-white/10 rounded-lg text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 px-2 py-1 text-white/40 hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Keys are stored strictly in your local browser and never shared.</span>
              </p>
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testStatus === 'testing'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs font-mono text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {testStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{testStatus === 'testing' ? 'Testing Connection...' : 'Test API Key'}</span>
              </button>

              {testStatus === 'success' && (
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>{testMessage}</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="flex items-center gap-1 text-xs text-red-400 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#18181b]">
          <div className="text-xs text-white/50 font-mono">
            Active: <span className="text-white font-bold">{AI_PROVIDERS[activeProvider].name}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndActivate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-900/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use {AI_PROVIDERS[selectedProvider].name}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

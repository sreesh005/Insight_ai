import React, { useState } from 'react';
import {
  X,
  Puzzle,
  Copy,
  Check,
  Code,
  ExternalLink,
  Sparkles,
  Layers,
  ShieldCheck,
  Download,
  Terminal,
  Monitor,
  Laptop,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { downloadExtensionZip, EXTENSION_SOURCE_FILES } from '../utils/extensionZipExporter';
import { FeaturedVideo } from '../types';

interface ExtensionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVideo?: FeaturedVideo;
  onSeek?: (seconds: number) => void;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({
  isOpen,
  onClose,
  currentVideo,
  onSeek
}) => {
  const [activeTab, setActiveTab] = useState<'install' | 'zerocost' | 'simulator' | 'manifest' | 'background' | 'content' | 'sidepanel'>('install');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Simulator State
  const [simInput, setSimInput] = useState<string>('');
  const [simLength, setSimLength] = useState<'short' | 'long'>('short');
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    {
      sender: 'assistant',
      text: `👋 Insight.ai Side Panel is connected to **${currentVideo?.title || 'YouTube'}**.\n\nAsk anything or click timestamps to jump!`,
      time: 'Live'
    }
  ]);
  const [isSimThinking, setIsSimThinking] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadExtensionZip();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimSend = (text: string) => {
    if (!text.trim() || isSimThinking) return;

    const userText = text.trim();
    setSimInput('');
    setSimMessages((prev) => [...prev, { sender: 'user', text: userText, time: 'Just now' }]);
    setIsSimThinking(true);

    setTimeout(() => {
      let reply = '';
      if (simLength === 'short') {
        reply = `**Summary for "${currentVideo?.title || 'Video'}"**:
When analyzing *"${userText}"*, the video breaks down the mechanism into core stages.

• **Key Moment** [02:15]: Core foundational concept setup.
• **Execution** [06:40]: Detailed demonstration in action.

**Bottom Line**: Understanding this interaction allows you to predict system behavior accurately.`;
      } else {
        reply = `### 🎓 In-Depth Conceptual Breakdown: ${userText}

#### 💡 Core Principle
In **"${currentVideo?.title || 'Video'}"**, this concept is introduced at [02:15] to explain the underlying mechanics.

#### 🔍 Step-by-Step Breakdown
• **Initial Setup** [02:15]: The foundational parameters are established.
• **Primary Mechanism** [06:40]: Sequential processing where each output feeds into the next stage.
• **Evaluation** [12:30]: Verification against baseline metrics.

Click any timestamp above to test real-time seeking in the player!`;
      }

      setSimMessages((prev) => [...prev, { sender: 'assistant', text: reply, time: 'Just now' }]);
      setIsSimThinking(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#111115] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#16161c]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-inner">
              <Puzzle className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif italic text-lg sm:text-xl text-white font-medium">Google Chrome Extension Package</h2>
                <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-mono text-indigo-300 font-bold">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-white/50">Run Insight.ai as a native Side Panel docked right alongside YouTube.com</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Packaging ZIP...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Extension .ZIP</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#0c0c10] text-xs font-mono px-4 sm:px-6 overflow-x-auto gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setActiveTab('install')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'install'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1. Install & Download</span>
          </button>

          <button
            onClick={() => setActiveTab('zerocost')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zerocost'
                ? 'text-emerald-400 border-emerald-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Zero Cost & Store Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Side Panel Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'manifest'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>manifest.json</span>
          </button>

          <button
            onClick={() => setActiveTab('background')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'background'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>background.js</span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'content'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>content.js</span>
          </button>

          <button
            onClick={() => setActiveTab('sidepanel')}
            className={`py-3 px-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sidepanel'
                ? 'text-indigo-400 border-indigo-500 font-bold'
                : 'text-white/40 border-transparent hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>sidepanel.js</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs text-white/80 space-y-4">
          {/* TAB 1: INSTALLATION & DOWNLOAD */}
          {activeTab === 'install' && (
            <div className="space-y-6">
              {/* Primary Callout & Download CTA */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-[#14141c] border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Ready-to-Load Chrome Extension Bundle</span>
                  </div>
                  <p className="text-white/70 max-w-xl text-xs leading-relaxed">
                    Download the complete Chrome Extension package with Manifest V3, Side Panel API support, real-time YouTube video controllers, and icons.
                  </p>
                </div>
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloading}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all shrink-0 cursor-pointer text-xs"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating ZIP...</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Downloaded Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Extension .ZIP</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Step Walkthrough */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-white text-sm">Unzip Folder</h3>
                  <p className="text-white/60 text-xs">
                    Extract the downloaded <code className="text-indigo-300 bg-black/40 px-1 py-0.5 rounded">insight-ai-chrome-extension.zip</code> into any folder on your computer.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-white text-sm">Open chrome://extensions</h3>
                  <p className="text-white/60 text-xs">
                    In Chrome, visit <code className="text-indigo-300 bg-black/40 px-1 py-0.5 rounded">chrome://extensions</code>, turn on <strong>Developer mode</strong> (top right), and click <strong>Load unpacked</strong>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 relative">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-white text-sm">Open on YouTube</h3>
                  <p className="text-white/60 text-xs">
                    Navigate to any video on YouTube and click the Insight.ai puzzle/sidepanel icon. The assistant docks right beside your video!
                  </p>
                  <div className="mt-2 text-[11px] bg-indigo-950/60 border border-indigo-500/30 p-2 rounded-lg text-indigo-300">
                    💡 <strong>Pro-Tip:</strong> If your YouTube tab was open before installing, give it a quick <strong>Refresh (F5 / Cmd+R)</strong> so the player hooks instantly.
                  </div>
                </div>
              </div>

              {/* Features breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#14141a] border border-white/10 space-y-2.5">
                  <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Native Chrome Side Panel Advantages</span>
                  </h4>
                  <ul className="space-y-1.5 text-white/70 text-xs">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span><strong>Zero Link Pasting:</strong> Automatically tracks whichever video you are currently watching.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span><strong>Native Video Seeking:</strong> Clicking timestamp citations instantly jumps the native YouTube player.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span><strong>Persistent Sidebar:</strong> Stays open across video recommendations, search results, and playlists.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#14141a] border border-white/10 space-y-2.5">
                  <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Included in the Bundle</span>
                  </h4>
                  <ul className="space-y-1.5 text-white/70 text-xs font-mono">
                    <li className="flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>manifest.json (V3 configuration & permissions)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>background.js (Side Panel lifecycle & tab updates)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>content.js (YouTube HTML5 video hook & seeker)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>sidepanel.html / .js / .css (Co-pilot tutor UI)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-indigo-400">•</span>
                      <span>icons (16px, 32px, 48px, 128px assets)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ZERO COST & CHROME WEB STORE GUIDE */}
          {activeTab === 'zerocost' && (
            <div className="space-y-6">
              {/* Highlight Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-[#14141c] border border-emerald-500/30 shadow-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>100% Free Bring-Your-Own-Key (BYOK) Architecture</span>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  As the extension author, you incur <strong>$0 in server hosting or LLM API billing</strong>. When you publish to the Chrome Web Store or test locally, every user connects their own personal API key directly from Google AI Studio, Groq, OpenAI, Anthropic Claude, DeepSeek, OpenRouter, Mistral, or their own local Ollama server.
                </p>
              </div>

              {/* Supported Providers Matrix */}
              <div className="p-4 rounded-xl bg-[#14141a] border border-white/10 space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Supported AI Providers &amp; Free Tiers</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                      <span>✨</span>
                      <span>Google Gemini</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-medium">100% Free Forever</p>
                    <p className="text-[10px] text-white/50">1,500 queries/day on Gemini 2.0 Flash with no credit card required.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                      <span>⚡</span>
                      <span>Groq Cloud</span>
                    </div>
                    <p className="text-[10px] text-amber-300 font-medium">Ultra-Fast Free Tier</p>
                    <p className="text-[10px] text-white/50">Llama 3.3 70B &amp; 8B with 500+ tokens/sec inference.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                      <span>🟢</span>
                      <span>OpenAI &amp; Claude</span>
                    </div>
                    <p className="text-[10px] text-indigo-300 font-medium">Direct BYOK</p>
                    <p className="text-[10px] text-white/50">GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3.5 Haiku.</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                      <span>💻</span>
                      <span>DeepSeek &amp; Ollama</span>
                    </div>
                    <p className="text-[10px] text-cyan-300 font-medium">Open Weights &amp; Local</p>
                    <p className="text-[10px] text-white/50">DeepSeek R1 / V3, OpenRouter, Mistral, and local Ollama servers.</p>
                  </div>
                </div>
              </div>

              {/* Step by Step Zero Cost Workflow */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#14141a] border border-white/10 space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>How Users Get Their Free Key ($0 Cost)</span>
                  </h4>
                  <ol className="space-y-2 text-white/70 text-xs list-decimal pl-4">
                    <li>Users go to <strong className="text-emerald-300">aistudio.google.com</strong> or <strong className="text-amber-300">console.groq.com</strong>.</li>
                    <li>Click <strong>&quot;Get API key&quot;</strong> &rarr; <strong>&quot;Create API key&quot;</strong>.</li>
                    <li>Generous free tiers are available with zero credit card or upfront payment.</li>
                    <li>The user selects their provider in Insight.ai Side Panel Settings and pastes their key.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#14141a] border border-white/10 space-y-3">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Publishing to Chrome Web Store</span>
                  </h4>
                  <ol className="space-y-2 text-white/70 text-xs list-decimal pl-4">
                    <li>Download the <strong className="text-indigo-300">insight-ai-chrome-extension.zip</strong> from this app.</li>
                    <li>Visit the <strong className="text-indigo-300">Chrome Web Store Developer Dashboard</strong>.</li>
                    <li>Upload the ZIP file (contains Manifest V3, Multi-LLM BYOK, and Side Panel config).</li>
                    <li>Fill out store listing details, screenshots, and submit for review.</li>
                    <li>No backend server or database maintenance required!</li>
                  </ol>
                </div>
              </div>

              {/* Security & Privacy */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Security &amp; Privacy Verification</span>
                </h4>
                <p className="text-white/60 text-xs">
                  User keys are stored strictly in Chrome&apos;s isolated <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">chrome.storage.local</code> sandbox on their own device. Keys are never sent to any intermediary server; API requests go directly from the user&apos;s browser to the chosen provider&apos;s encrypted API endpoint.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs flex items-center justify-between text-indigo-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Simulating Chrome Extension Side Panel docked to: <strong>{currentVideo?.title || 'YouTube Video'}</strong></span>
                </span>
                <span className="text-[10px] font-mono bg-indigo-600/30 px-2 py-0.5 rounded border border-indigo-400/30">
                  Interactive Preview
                </span>
              </div>

              {/* Side Panel Mockup Frame */}
              <div className="max-w-md mx-auto bg-[#0a0a0d] border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
                {/* Mockup Header */}
                <div className="p-3 bg-[#14141a] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                    </div>
                    <span className="font-bold text-white text-xs">Insight.ai</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Synced with Tab</span>
                  </div>
                </div>

                {/* Video Info Pill */}
                <div className="px-3 py-2 bg-[#101015] border-b border-white/5 flex items-center gap-2">
                  <img
                    src={currentVideo?.thumbnailUrl || 'https://img.youtube.com/vi/zjkBMFhNj_g/hqdefault.jpg'}
                    alt="Thumbnail"
                    className="w-10 h-6 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white truncate">{currentVideo?.title || 'YouTube Video'}</p>
                    <p className="text-[9px] text-white/50 truncate">{currentVideo?.channelTitle || 'YouTube Channel'}</p>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
                  {simMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'assistant' && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-[9px] font-bold flex items-center justify-center text-white shrink-0 mt-0.5">
                          AI
                        </div>
                      )}
                      <div
                        className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-[#181820] border border-white/10 text-white/90 rounded-bl-none'
                        }`}
                      >
                        <div className="space-y-1.5 leading-relaxed whitespace-pre-wrap">
                          {msg.text.split(/(\[\d{1,2}:\d{2}\])/g).map((part, pIdx) => {
                            const match = part.match(/\[(\d{1,2}:\d{2})\]/);
                            if (match) {
                              const timeStr = match[1];
                              const parts = timeStr.split(':').map(Number);
                              const sec = parts[0] * 60 + parts[1];
                              return (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => onSeek && onSeek(sec)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-500/20 hover:bg-indigo-600 border border-indigo-500/40 rounded text-[10px] font-mono text-indigo-300 hover:text-white font-bold transition-all mx-0.5 cursor-pointer"
                                  title={`Seek video to ${timeStr}`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{timeStr}</span>
                                </button>
                              );
                            }
                            return <span key={pIdx}>{part}</span>;
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSimThinking && (
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-[9px] font-bold flex items-center justify-center text-white shrink-0">
                        AI
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#181820] border border-white/10 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="px-3 py-1.5 bg-[#0e0e12] border-t border-white/5 flex gap-1.5 overflow-x-auto shrink-0">
                  <button
                    onClick={() => handleSimSend('Can you explain the main idea simply with key moments?')}
                    className="px-2 py-0.5 bg-white/5 hover:bg-indigo-600/30 rounded text-[10px] text-white/70 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer"
                  >
                    ⚡ Summarize
                  </button>
                  <button
                    onClick={() => handleSimSend('What are the key technical terms in this video?')}
                    className="px-2 py-0.5 bg-white/5 hover:bg-indigo-600/30 rounded text-[10px] text-white/70 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer"
                  >
                    📚 Key Terms
                  </button>
                  <button
                    onClick={() => handleSimSend('Can you tutor me step-by-step on this concept?')}
                    className="px-2 py-0.5 bg-white/5 hover:bg-indigo-600/30 rounded text-[10px] text-white/70 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer"
                  >
                    🎓 Tutor Me
                  </button>
                </div>

                {/* Simulator Footer */}
                <div className="p-3 bg-[#121217] border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-indigo-300 font-mono font-bold uppercase">Detail Level:</span>
                    <div className="flex gap-1 bg-black/40 p-0.5 rounded border border-white/10 font-mono">
                      <button
                        type="button"
                        onClick={() => setSimLength('short')}
                        className={`px-2 py-0.5 rounded ${simLength === 'short' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50'}`}
                      >
                        ⚡ Short
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimLength('long')}
                        className={`px-2 py-0.5 rounded ${simLength === 'long' ? 'bg-indigo-600 text-white font-bold' : 'text-white/50'}`}
                      >
                        📚 Detailed
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSimSend(simInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={simInput}
                      onChange={(e) => setSimInput(e.target.value)}
                      placeholder="Ask about this video..."
                      className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!simInput.trim() || isSimThinking}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANIFEST.JSON */}
          {activeTab === 'manifest' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60">manifest.json (Chrome Manifest V3)</span>
                <button
                  onClick={() => copyToClipboard(EXTENSION_SOURCE_FILES.manifest, 'manifest')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'manifest' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-indigo-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {EXTENSION_SOURCE_FILES.manifest}
              </pre>
            </div>
          )}

          {/* TAB 4: BACKGROUND.JS */}
          {activeTab === 'background' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60">background.js (Service Worker)</span>
                <button
                  onClick={() => copyToClipboard(EXTENSION_SOURCE_FILES.background, 'background')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'background' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'background' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-purple-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {EXTENSION_SOURCE_FILES.background}
              </pre>
            </div>
          )}

          {/* TAB 5: CONTENT.JS */}
          {activeTab === 'content' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60">content.js (YouTube DOM & Playback Hook)</span>
                <button
                  onClick={() => copyToClipboard(EXTENSION_SOURCE_FILES.content, 'content')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'content' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'content' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {EXTENSION_SOURCE_FILES.content}
              </pre>
            </div>
          )}

          {/* TAB 6: SIDEPANEL.JS */}
          {activeTab === 'sidepanel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-white/60">sidepanel.js (UI & Assistant Controller)</span>
                <button
                  onClick={() => copyToClipboard(EXTENSION_SOURCE_FILES.sidepanelJs, 'sidepanel')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'sidepanel' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'sidepanel' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-black/80 rounded-xl border border-white/10 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {EXTENSION_SOURCE_FILES.sidepanelJs}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0f0f14] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-mono text-white/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Chrome Web Store / Developer Mode Compatible</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download .ZIP</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-sans font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

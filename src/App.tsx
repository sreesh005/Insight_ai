import React, { useState, useRef, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { YouTubePlayer } from './components/YouTubePlayer';
import { TranscriptTab } from './components/TranscriptTab';
import { ChaptersTab } from './components/ChaptersTab';
import { AIChatSidebar } from './components/AIChatSidebar';
import { SampleLibraryModal } from './components/SampleLibraryModal';
import { UrlInputModal } from './components/UrlInputModal';
import { ExtensionGuideModal } from './components/ExtensionGuideModal';
import { AIProviderModal } from './components/AIProviderModal';
import { FooterBar } from './components/FooterBar';
import { FEATURED_VIDEOS } from './data/featuredVideos';
import { AI_PROVIDERS } from './data/providers';
import { FeaturedVideo, ChatMessage, TranscriptSegment, AnswerLength, AIProvider } from './types';
import { Sparkles, Play, Clock, Youtube, ChevronRight, X, Command, MoveHorizontal, Key } from 'lucide-react';
import { executeClientSideChat, buildSystemPrompt, extractCitationsFromText } from './utils/aiClient';

export default function App() {
  // Select initial video (Default: Andrej Karpathy LLM Intro)
  const [currentVideo, setCurrentVideo] = useState<FeaturedVideo>(FEATURED_VIDEOS[0]);
  const [activeTab, setActiveTab] = useState<'video' | 'transcript' | 'chapters'>('video');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);

  // AI Provider & Key State (Persisted in localStorage)
  const [activeProvider, setActiveProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('insight_web_provider') as AIProvider) || 'gemini';
  });
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('insight_web_keys') || '{}');
    } catch {
      return {};
    }
  });
  const [providerModels, setProviderModels] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('insight_web_models') || '{}');
    } catch {
      return {};
    }
  });
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    return localStorage.getItem('insight_web_custom_url') || 'http://localhost:11434/v1';
  });

  const handleProviderChange = (newProvider: AIProvider) => {
    setActiveProvider(newProvider);
    localStorage.setItem('insight_web_provider', newProvider);
  };

  const handleKeyChange = (provider: AIProvider, key: string) => {
    setProviderKeys((prev) => {
      const updated = { ...prev, [provider]: key };
      localStorage.setItem('insight_web_keys', JSON.stringify(updated));
      return updated;
    });
  };

  const handleModelChange = (provider: AIProvider, model: string) => {
    setProviderModels((prev) => {
      const updated = { ...prev, [provider]: model };
      localStorage.setItem('insight_web_models', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCustomBaseUrlChange = (url: string) => {
    setCustomBaseUrl(url);
    localStorage.setItem('insight_web_custom_url', url);
  };

  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState<number>(450);
  const isResizingRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= Math.min(850, window.innerWidth - 320)) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'user',
      text: 'How does pretraining differ from fine-tuning in LLMs?',
      timestamp: '08:45'
    },
    {
      id: '2',
      sender: 'assistant',
      text: `In the video, Andrej Karpathy explains that pretraining at [09:00] involves scraping trillions of words from the internet and training on GPU clusters for months to build a Base Model.\n\nFine-tuning (SFT) at [22:00] takes that Base Model and trains it on high-quality human demonstration datasets to turn it into a helpful conversational assistant.`,
      timestamp: '08:46',
      citationTimestamps: [
        { formattedTime: '09:00', seconds: 540 },
        { formattedTime: '22:00', seconds: 1320 }
      ]
    }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Modals State
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState<boolean>(false);
  const [isExtensionGuideOpen, setIsExtensionGuideOpen] = useState<boolean>(false);
  const [isAIProviderModalOpen, setIsAIProviderModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isCustomUrlLoading, setIsCustomUrlLoading] = useState<boolean>(false);

  // Handle timestamp click / jump
  const handleSeek = (seconds: number) => {
    setSeekToTime(seconds);
  };

  // Check if current provider has an active API key configured
  const hasActiveKey = activeProvider === 'custom'
    ? true
    : Boolean(providerKeys[activeProvider] && providerKeys[activeProvider].trim().length > 3);

  // Handle user asking a question
  const handleSendMessage = async (question: string, answerLength: AnswerLength = 'short') => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    const activeKey = providerKeys[activeProvider] || '';
    const activeModel = providerModels[activeProvider] || AI_PROVIDERS[activeProvider]?.defaultModel;

    // If key is missing, prompt the user with clear instructions and open the configuration dialog
    if (!hasActiveKey && activeProvider !== 'custom') {
      setIsChatLoading(false);
      const promptKeyMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `### 🔑 API Key Required Before Getting Started
To get AI-powered tutoring, timestamped citations, quiz generation, and math explanations, please connect your API key.

**Popular Free Options:**
- **Google Gemini**: 1,500 free queries/day ([Get free key](https://aistudio.google.com/app/apikey))
- **Groq**: Free ultra-fast LPU inference ([Get free key](https://console.groq.com/keys))
- **OpenAI / Claude / DeepSeek**: High accuracy full reasoning
- **Ollama**: 100% free and local

👉 **[⚙️ Click Here to Add Your API Key](#open-provider-settings)** to enable instant AI answers.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, promptKeyMsg]);
      setIsAIProviderModalOpen(true);
      return;
    }

    // Prepare full transcript text
    const transcriptText = currentVideo.transcript
      .map((t) => `[${t.formattedTime}] ${t.text}`)
      .join('\n');

    try {
      // 1. Try full-stack Express route first if available
      try {
        const response = await fetch('/api/youtube/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoTitle: currentVideo.title,
            transcriptText,
            messages: chatMessages,
            userQuestion: question,
            answerLength,
            provider: activeProvider,
            apiKey: activeKey,
            model: activeModel,
            customBaseUrl: activeProvider === 'custom' ? customBaseUrl : undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citationTimestamps: data.citationTimestamps
          };
          setChatMessages((prev) => [...prev, aiMsg]);
          return;
        }
      } catch (serverErr) {
        console.warn('Backend proxy unavailable, falling back to direct browser client:', serverErr);
      }

      // 2. Direct client-side execution (Works seamlessly on Vercel, Netlify, Static Hosts, and Extensions)
      const systemPrompt = buildSystemPrompt({
        videoTitle: currentVideo.title,
        transcriptText,
        answerLength
      });

      const replyText = await executeClientSideChat({
        provider: activeProvider,
        apiKey: activeKey,
        model: activeModel,
        customBaseUrl: activeProvider === 'custom' ? customBaseUrl : undefined,
        systemPrompt,
        messages: chatMessages,
        userQuestion: question,
        answerLength
      });

      const citations = extractCitationsFromText(replyText);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citationTimestamps: citations
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      console.warn('AI execution error:', e);
      const errorMessage = e?.message || 'Failed to communicate with AI provider.';
      const aiErrorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ **AI Provider Error:** ${errorMessage}\n\nPlease check your key or try another provider in **[AI Settings](#open-provider-settings)**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiErrorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Extract video ID on client side for fallback
  const extractClientVideoId = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    try {
      const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(fullUrl);
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      for (const segment of pathSegments) {
        if (/^[a-zA-Z0-9_-]{11}$/.test(segment)) {
          return segment;
        }
      }
    } catch (e) {}

    const match = trimmed.match(/(?:v=|v\/|embed\/|shorts\/|live\/|youtu\.be\/|\/)([\w-]{11})/);
    if (match && match[1]) {
      return match[1];
    }

    const any11 = trimmed.match(/([a-zA-Z0-9_-]{11})/);
    if (any11) {
      return any11[1];
    }

    return trimmed;
  };

  // Load custom YouTube URL
  const handleLoadCustomUrl = async (url: string) => {
    setIsCustomUrlLoading(true);
    const fallbackId = extractClientVideoId(url);

    try {
      const response = await fetch('/api/youtube/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (response.ok) {
        const data = await response.json();
        const videoId = data.id || fallbackId;
        const customVideo: FeaturedVideo = {
          id: videoId,
          title: data.title || `YouTube Video (${videoId})`,
          channelTitle: data.channelTitle || 'YouTube Channel',
          subscriberCount: '1.0M',
          publishDate: 'Recent',
          duration: data.transcript && data.transcript.length > 0 ? data.transcript[data.transcript.length - 1].formattedTime : '15:00',
          durationSeconds: data.transcript && data.transcript.length > 0 ? data.transcript[data.transcript.length - 1].start : 900,
          thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          description: data.description || 'Custom YouTube video loaded into Insight.ai',
          chapters: [
            { time: 0, formattedTime: '00:00', title: 'Video Overview & Start', description: 'Introductory remarks and core presentation.' }
          ],
          transcript: data.transcript && data.transcript.length > 0 ? data.transcript : [
            { start: 0, duration: 10, formattedTime: '00:00', text: `Loaded video: ${data.title || videoId}` },
            { start: 10, duration: 20, formattedTime: '00:10', text: `Channel: ${data.channelTitle || 'YouTube'}` }
          ],
          suggestedQuestions: [
            'What is the main summary of this video?',
            'What are the key takeaways?',
            'List important terms mentioned'
          ]
        };

        setCurrentVideo(customVideo);
        setChatMessages([
          {
            id: 'init',
            sender: 'assistant',
            text: `Successfully loaded **"${customVideo.title}"**! Ask me anything about this video or request a summary.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsUrlModalOpen(false);
      } else {
        throw new Error('Backend returned error');
      }
    } catch (e) {
      console.warn('Backend video info fetch error, using client fallback:', e);
      if (fallbackId && fallbackId.length === 11) {
        const customVideo: FeaturedVideo = {
          id: fallbackId,
          title: `YouTube Video (${fallbackId})`,
          channelTitle: 'YouTube Video',
          subscriberCount: '1.0M',
          publishDate: 'Recent',
          duration: '10:00',
          durationSeconds: 600,
          thumbnailUrl: `https://img.youtube.com/vi/${fallbackId}/hqdefault.jpg`,
          description: `Loaded custom video ID: ${fallbackId}`,
          chapters: [
            { time: 0, formattedTime: '00:00', title: 'Video Start', description: 'Overview of loaded video.' }
          ],
          transcript: [
            { start: 0, duration: 10, formattedTime: '00:00', text: `Loaded YouTube Video ID: ${fallbackId}` }
          ],
          suggestedQuestions: [
            'What is the main summary of this video?',
            'What are the key takeaways?'
          ]
        };
        setCurrentVideo(customVideo);
        setChatMessages([
          {
            id: 'init',
            sender: 'assistant',
            text: `Loaded video **${fallbackId}**! Ask me anything about this video.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsUrlModalOpen(false);
      } else {
        alert('Invalid YouTube URL or Video ID. Please check the link and try again.');
      }
    } finally {
      setIsCustomUrlLoading(false);
    }
  };

  // Calculate word count
  const wordCount = currentVideo.transcript.reduce(
    (acc, seg) => acc + seg.text.split(' ').length,
    0
  );

  return (
    <div className="w-full h-screen bg-[#0a0a0a] text-[#e0e0e0] font-sans flex flex-col overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenUrlInput={() => setIsUrlModalOpen(true)}
        onOpenExtensionGuide={() => setIsExtensionGuideOpen(true)}
        onOpenAIProvider={() => setIsAIProviderModalOpen(true)}
        activeProvider={activeProvider}
        hasActiveKey={hasActiveKey}
        videoTitle={currentVideo.title}
        isCustomUrlLoading={isCustomUrlLoading}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Area: Video Player & Context Views */}
        <div className="flex-[2.5] p-6 flex flex-col gap-4 overflow-hidden border-r border-white/5">
          {/* Main Tab Content Switcher */}
          {activeTab === 'video' ? (
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
              {/* Embedded YouTube Player */}
              <YouTubePlayer
                videoId={currentVideo.id}
                onTimeUpdate={setCurrentTime}
                seekToTime={seekToTime}
                onSeekHandled={() => setSeekToTime(null)}
              />

              {/* Video Title & Author Metadata */}
              <div className="mt-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-serif italic text-2xl md:text-3xl text-white tracking-wide leading-tight">
                    {currentVideo.title}
                  </h1>
                  <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/30 rounded-xl text-xs font-mono text-white/70 hover:text-white shrink-0 transition-colors"
                  >
                    Switch Video
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    {currentVideo.channelTitle.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{currentVideo.channelTitle}</p>
                    <p className="text-[10px] font-mono text-white/40">
                      {currentVideo.subscriberCount} subscribers • {currentVideo.publishDate}
                    </p>
                  </div>
                </div>

                {/* Video Description Box */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 mt-1">
                  <p className="text-xs leading-relaxed text-white/70">
                    {currentVideo.description}
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'transcript' ? (
            <TranscriptTab
              transcript={currentVideo.transcript}
              currentTime={currentTime}
              onSeek={handleSeek}
              videoTitle={currentVideo.title}
            />
          ) : (
            <ChaptersTab
              chapters={currentVideo.chapters}
              onSeek={handleSeek}
              onAskAI={handleSendMessage}
              description={currentVideo.description}
            />
          )}
        </div>

        {/* Resizable Divider Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-2 hover:w-3 bg-white/5 hover:bg-indigo-500/50 active:bg-indigo-600 transition-all cursor-col-resize flex items-center justify-center shrink-0 z-20 group relative border-x border-white/5"
          title="Drag left/right to resize AI Tutor sidebar"
        >
          <div className="w-0.5 h-12 bg-white/20 group-hover:bg-white rounded-full transition-colors flex flex-col items-center justify-center gap-1">
            <div className="w-1 h-1 bg-white/40 rounded-full" />
            <div className="w-1 h-1 bg-white/40 rounded-full" />
          </div>
        </div>

        {/* Right Area: AI Assistant Sidebar */}
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 flex flex-col h-full bg-[#0f0f0f] relative overflow-hidden"
        >
          <AIChatSidebar
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            onSeek={handleSeek}
            wordCount={wordCount}
            suggestedQuestions={currentVideo.suggestedQuestions}
            transcriptLoaded={true}
            activeProvider={activeProvider}
            activeModel={providerModels[activeProvider]}
            hasActiveKey={hasActiveKey}
            onOpenAIProvider={() => setIsAIProviderModalOpen(true)}
          />
        </div>
      </main>

      {/* Footer Mini-Control Status Bar */}
      <FooterBar
        wordCount={wordCount}
        chapterCount={currentVideo.chapters.length}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* AI Provider & Key Settings Modal */}
      <AIProviderModal
        isOpen={isAIProviderModalOpen}
        onClose={() => setIsAIProviderModalOpen(false)}
        activeProvider={activeProvider}
        onProviderChange={handleProviderChange}
        providerKeys={providerKeys}
        onKeyChange={handleKeyChange}
        providerModels={providerModels}
        onModelChange={handleModelChange}
        customBaseUrl={customBaseUrl}
        onCustomBaseUrlChange={handleCustomBaseUrlChange}
      />

      {/* Featured Video Library Modal */}
      <SampleLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectVideo={(video) => {
          setCurrentVideo(video);
          setChatMessages([
            {
              id: 'init-' + video.id,
              sender: 'assistant',
              text: `Switched context to **"${video.title}"**. I have indexed all ${video.transcript.length} transcript lines. How can I help you understand this video?`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }}
        currentVideoId={currentVideo.id}
      />

      {/* Load Custom URL Modal */}
      <UrlInputModal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        onSubmitUrl={handleLoadCustomUrl}
        isLoading={isCustomUrlLoading}
      />

      {/* Chrome Extension Package & Simulator Modal */}
      <ExtensionGuideModal
        isOpen={isExtensionGuideOpen}
        onClose={() => setIsExtensionGuideOpen(false)}
        currentVideo={currentVideo}
        onSeek={handleSeek}
      />

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif italic text-lg text-white flex items-center gap-2">
                <Command className="w-4 h-4 text-indigo-400" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/70">Jump to timestamp</span>
                <span className="text-indigo-400">Click [MM:SS] pill</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/70">Submit question</span>
                <span className="text-indigo-400">Enter</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/70">New line in prompt</span>
                <span className="text-indigo-400">Shift + Enter</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-white/5">
                <span className="text-white/70">Switch view modes</span>
                <span className="text-indigo-400">Header Tabs</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

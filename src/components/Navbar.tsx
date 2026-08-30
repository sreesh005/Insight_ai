import React from 'react';
import { Play, Sparkles, Youtube, Layers, Settings, Link as LinkIcon, Puzzle, Cpu } from 'lucide-react';
import { AIProvider } from '../types';
import { AI_PROVIDERS } from '../data/providers';

interface NavbarProps {
  activeTab: 'video' | 'transcript' | 'chapters';
  setActiveTab: (tab: 'video' | 'transcript' | 'chapters') => void;
  onOpenLibrary: () => void;
  onOpenUrlInput: () => void;
  onOpenExtensionGuide?: () => void;
  onOpenAIProvider?: () => void;
  activeProvider?: AIProvider;
  hasActiveKey?: boolean;
  videoTitle?: string;
  isCustomUrlLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLibrary,
  onOpenUrlInput,
  onOpenExtensionGuide,
  onOpenAIProvider,
  activeProvider = 'gemini',
  hasActiveKey = false,
  videoTitle,
  isCustomUrlLoading
}) => {
  const currentProvider = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;

  return (
    <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f0f0f] select-none z-20">
      {/* Brand */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenLibrary}>
        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/30">
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5"></div>
        </div>
        <div className="flex flex-col">
          <span className="font-serif italic text-xl tracking-wide text-white font-medium flex items-center gap-1">
            Insight<span className="text-red-500 font-sans font-bold text-xs not-italic">.ai</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-white/40 -mt-1 font-mono">
            YouTube Context Engine
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-6 text-xs text-white/50 uppercase tracking-[0.2em] font-medium items-center">
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1.5 transition-colors py-1 border-b-2 ${
            activeTab === 'video'
              ? 'text-white border-red-500 font-bold'
              : 'border-transparent hover:text-white/80'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Video Mode</span>
        </button>

        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex items-center gap-1.5 transition-colors py-1 border-b-2 ${
            activeTab === 'transcript'
              ? 'text-white border-indigo-500 font-bold'
              : 'border-transparent hover:text-white/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Transcript</span>
        </button>

        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1.5 transition-colors py-1 border-b-2 border-transparent hover:text-white/80"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Library</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onOpenAIProvider && (
          <button
            onClick={onOpenAIProvider}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer shadow-sm ${
              hasActiveKey || activeProvider === 'custom'
                ? 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 text-white'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 animate-pulse'
            }`}
            title="Configure AI Provider & Keys (Gemini, Groq, Claude, OpenAI, DeepSeek, Custom)"
          >
            <span className="text-sm">{currentProvider.icon}</span>
            <span className="hidden sm:inline text-white/90">{currentProvider.name}</span>
            {hasActiveKey || activeProvider === 'custom' ? (
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-[9px] rounded text-indigo-300 uppercase font-sans font-bold">BYOK</span>
            ) : (
              <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[9px] rounded uppercase font-sans font-bold">ADD KEY</span>
            )}
          </button>
        )}

        {onOpenExtensionGuide && (
          <button
            onClick={onOpenExtensionGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 hover:border-indigo-400 rounded-lg text-xs font-mono font-bold text-indigo-200 hover:text-white transition-all shadow-sm hover:shadow-indigo-900/40 cursor-pointer"
            title="Download Chrome Extension (Manifest V3) or run live simulator"
          >
            <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chrome Extension</span>
            <span className="px-1.5 py-0.2 bg-indigo-500/30 text-[9px] rounded text-indigo-200 uppercase font-sans">V3</span>
          </button>
        )}

        <button
          onClick={onOpenUrlInput}
          disabled={isCustomUrlLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/30 rounded-lg text-xs font-medium text-white/90 hover:text-white transition-all hover:bg-white/10"
        >
          <LinkIcon className="w-3.5 h-3.5 text-red-400" />
          <span>{isCustomUrlLoading ? 'Analyzing URL...' : 'Load YouTube URL'}</span>
        </button>

        <button
          onClick={onOpenLibrary}
          className="p-2 text-white/50 hover:text-white transition-colors"
          title="Settings / Select Video"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};

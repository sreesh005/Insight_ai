import React from 'react';
import { FileText, CheckCircle2, Command, Key, Sparkles } from 'lucide-react';
import { AIProvider } from '../types';
import { AI_PROVIDERS } from '../data/providers';

interface FooterBarProps {
  wordCount: number;
  chapterCount: number;
  activeProvider?: AIProvider;
  activeModel?: string;
  hasActiveKey?: boolean;
  onOpenShortcuts: () => void;
  onOpenAIProvider?: () => void;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  wordCount,
  chapterCount,
  activeProvider = 'gemini',
  activeModel,
  hasActiveKey = false,
  onOpenShortcuts,
  onOpenAIProvider
}) => {
  const providerInfo = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;
  const currentModelName = activeModel || providerInfo.defaultModel;

  return (
    <footer className="h-10 bg-black border-t border-white/10 flex items-center px-6 text-[10px] text-white/40 font-mono font-medium justify-between select-none shrink-0 z-10">
      <div className="flex items-center gap-6">
        <button
          onClick={onOpenAIProvider}
          className="flex items-center gap-1.5 font-bold text-white/80 hover:text-white transition-colors cursor-pointer group"
          title="Click to configure AI Provider & Model"
        >
          <span className={`w-2 h-2 rounded-full ${hasActiveKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
          <span className="group-hover:text-indigo-300 transition-colors uppercase">
            {providerInfo.name}: {currentModelName}
          </span>
          {!hasActiveKey && activeProvider !== 'custom' && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/40">
              NO KEY
            </span>
          )}
        </button>
        <span className="hidden sm:inline flex items-center gap-1">
          <FileText className="w-3 h-3 text-white/30" />
          TRANSCRIPT LOADED ({wordCount.toLocaleString()} WORDS)
        </span>
        <span className="hidden md:inline flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {chapterCount} TIMESTAMP MARKERS SYNCED
        </span>
      </div>

      <div className="flex items-center gap-4 text-white/40">
        <button
          onClick={onOpenShortcuts}
          className="hover:text-white transition-colors uppercase flex items-center gap-1"
        >
          <Command className="w-3 h-3" />
          <span>KEYBOARD SHORTCUTS</span>
        </button>
      </div>
    </footer>
  );
};

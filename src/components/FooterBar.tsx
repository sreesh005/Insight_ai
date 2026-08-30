import React from 'react';
import { Cpu, FileText, CheckCircle2, Command } from 'lucide-react';

interface FooterBarProps {
  wordCount: number;
  chapterCount: number;
  onOpenShortcuts: () => void;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  wordCount,
  chapterCount,
  onOpenShortcuts
}) => {
  return (
    <footer className="h-10 bg-black border-t border-white/10 flex items-center px-6 text-[10px] text-white/40 font-mono font-medium justify-between select-none shrink-0 z-10">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 font-bold text-white/70">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          GEMINI 2.5 FLASH MODEL
        </span>
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
        <span className="text-white/10">|</span>
        <span className="hover:text-white cursor-pointer transition-colors uppercase">
          FEEDBACK
        </span>
      </div>
    </footer>
  );
};

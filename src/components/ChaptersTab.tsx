import React from 'react';
import { VideoChapter } from '../types';
import { Play, BookOpen, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

interface ChaptersTabProps {
  chapters: VideoChapter[];
  onSeek: (seconds: number) => void;
  onAskAI: (prompt: string) => void;
  description: string;
}

export const ChaptersTab: React.FC<ChaptersTabProps> = ({
  chapters,
  onSeek,
  onAskAI,
  description
}) => {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full pr-1">
      {/* Quick AI Summary Trigger Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Instant Analysis</h3>
            <p className="text-[11px] text-white/60">Generate full video breakdown with 1 click</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAskAI('Summarize this video in 3 key takeaways with exact timestamps.')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-950/50 flex items-center gap-1.5"
          >
            <span>Key Takeaways</span>
          </button>
          <button
            onClick={() => onAskAI('List all key formulas or core technical concepts explained in this video with timestamps.')}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg text-xs font-medium transition-all"
          >
            <span>Core Concepts</span>
          </button>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-white">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="font-serif italic text-lg">Video Chapters & Timeline</h2>
          </div>
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
            {chapters.length} MARKERS
          </span>
        </div>

        <div className="space-y-3">
          {chapters.map((chapter, idx) => (
            <div
              key={idx}
              onClick={() => onSeek(chapter.time)}
              className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/40 hover:bg-white/[0.04] transition-all cursor-pointer flex items-start gap-3 group"
            >
              <button className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 font-bold">
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{chapter.formattedTime}</span>
              </button>

              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {chapter.title}
                  </h4>
                  <span className="text-[10px] text-white/30 font-mono">Ch. {idx + 1}</span>
                </div>
                {chapter.description && (
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    {chapter.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Video Overview</h3>
        <p className="text-xs leading-relaxed text-white/70 whitespace-pre-line">
          {description}
        </p>
      </div>
    </div>
  );
};

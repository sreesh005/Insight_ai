import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment } from '../types';
import { Search, Copy, Check, Clock, Play } from 'lucide-react';

interface TranscriptTabProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  videoTitle: string;
}

export const TranscriptTab: React.FC<TranscriptTabProps> = ({
  transcript,
  currentTime,
  onSeek,
  videoTitle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  const filteredTranscript = transcript.filter((item) =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find active segment index
  const activeIndex = transcript.findIndex((seg, idx) => {
    const nextSeg = transcript[idx + 1];
    if (nextSeg) {
      return currentTime >= seg.start && currentTime < nextSeg.start;
    }
    return currentTime >= seg.start;
  });

  const handleCopy = () => {
    const fullText = transcript
      .map((t) => `[${t.formattedTime}] ${t.text}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] rounded-xl border border-white/10 overflow-hidden">
      {/* Transcript Header & Search */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#141414]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search words or phrases in transcript..."
            className="w-full pl-9 pr-4 py-1.5 bg-black/50 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-xs text-white/70 hover:text-white transition-colors"
          title="Copy full transcript with timestamps"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Transcript List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredTranscript.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-xs font-mono">
            No matching transcript lines found for "{searchTerm}"
          </div>
        ) : (
          filteredTranscript.map((segment, idx) => {
            const originalIndex = transcript.indexOf(segment);
            const isActive = originalIndex === activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(segment.start)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-lg shadow-indigo-950/20'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-white/70'
                }`}
              >
                <button
                  className={`flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded border transition-colors shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                      : 'bg-white/5 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:text-indigo-300'
                  }`}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{segment.formattedTime}</span>
                </button>

                <p className={`text-xs leading-relaxed ${isActive ? 'text-white font-medium' : 'text-white/80'}`}>
                  {segment.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

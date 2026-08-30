import React from 'react';
import { FeaturedVideo } from '../types';
import { FEATURED_VIDEOS } from '../data/featuredVideos';
import { Play, X, Sparkles, Youtube, Check } from 'lucide-react';

interface SampleLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: FeaturedVideo) => void;
  currentVideoId: string;
}

export const SampleLibraryModal: React.FC<SampleLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
  currentVideoId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif italic text-xl text-white">Video Context Library</h2>
              <p className="text-xs text-white/50">Select a featured video or analyze your own YouTube link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video List */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-white/40 font-mono font-bold">
              Pre-Indexed Featured Videos ({FEATURED_VIDEOS.length})
            </span>
            <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Full Transcript Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURED_VIDEOS.map((video) => {
              const isSelected = video.id === currentVideoId;

              return (
                <div
                  key={video.id}
                  onClick={() => {
                    onSelectVideo(video);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 group relative ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/30 hover:bg-white/[0.05] text-white/80'
                  }`}
                >
                  {/* Thumbnail & Duration */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden relative bg-black border border-white/10">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2">
                      <span className="text-[10px] font-mono bg-black/80 text-white px-2 py-0.5 rounded border border-white/20">
                        {video.duration}
                      </span>
                      <span className="text-[10px] font-mono bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                        {video.transcript.length} LINES
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                        {video.title}
                      </h3>
                      {isSelected && (
                        <span className="p-1 bg-indigo-500 text-white rounded-full shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50">{video.channelTitle}</p>
                    <p className="text-[10px] text-white/40 line-clamp-2 mt-1">
                      {video.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

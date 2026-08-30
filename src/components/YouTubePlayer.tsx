import React, { useEffect, useRef, useState } from 'react';
import { Play, ExternalLink, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;
  onSeekHandled?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onTimeUpdate,
  seekToTime,
  onSeekHandled
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const [useNoCookie, setUseNoCookie] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startSec, setStartSec] = useState<number>(0);
  const timeIntervalRef = useRef<any>(null);

  // Construct iframe embed URL with optional start timestamp
  const baseUrl = useNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  const embedUrl = `${baseUrl}/embed/${videoId}?enablejsapi=1&autoplay=0&rel=0&modestbranding=1${startSec > 0 ? `&start=${startSec}` : ''}`;

  // Initialize YT IFrame API
  useEffect(() => {
    let isSubscribed = true;

    function initPlayer() {
      if (!iframeRef.current || !window.YT || !window.YT.Player) return;

      try {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
            }
          }
        });
      } catch (err) {
        console.warn('YT Player init exception:', err);
      }
    }

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      isSubscribed = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId, useNoCookie]);

  // Track time updates every 500ms
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const sec = playerRef.current.getCurrentTime();
          if (typeof sec === 'number' && !isNaN(sec) && sec > 0) {
            setCurrentTime(sec);
            if (onTimeUpdate) {
              onTimeUpdate(sec);
            }
          }
        } catch (e) {
          // ignore iframe access errors
        }
      }
    }, 500);

    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    };
  }, [onTimeUpdate]);

  // Handle external seek requests from transcript or AI chat timestamp clicks
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined) {
      setCurrentTime(seekToTime);
      setStartSec(Math.floor(seekToTime));

      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(seekToTime, true);
          if (typeof playerRef.current.playVideo === 'function') {
            playerRef.current.playVideo();
          }
        } catch (e) {}
      } else if (iframeRef.current) {
        try {
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [seekToTime, true] }),
            '*'
          );
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        } catch (e) {}
      }

      if (onSeekHandled) {
        onSeekHandled();
      }
    }
  }, [seekToTime, onSeekHandled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remainingMins = mins % 60;
      return `${hrs}:${String(remainingMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-video w-full bg-black rounded-2xl relative border border-white/10 overflow-hidden shadow-2xl group">
        <iframe
          ref={iframeRef}
          key={`${videoId}-${useNoCookie ? 'nocookie' : 'std'}`}
          id="yt-embed-player"
          className="w-full h-full border-0 absolute inset-0 z-10"
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      {/* Toolbar for timestamp and player controls */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-white/60 px-1 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white/80 font-bold">Timestamp: {formatTime(currentTime)}</span>
          <button
            onClick={() => setUseNoCookie(!useNoCookie)}
            className="text-white/40 hover:text-white transition-colors underline text-[10px]"
            title="Toggle embed domain if player is blocked by browser policies"
          >
            {useNoCookie ? 'Switch to standard YouTube' : 'Switch to no-cookie mode'}
          </button>
        </div>

        <a
          href={`https://www.youtube.com/watch?v=${videoId}${currentTime > 0 ? `&t=${Math.floor(currentTime)}s` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1 text-xs"
        >
          <span>Watch on YouTube</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

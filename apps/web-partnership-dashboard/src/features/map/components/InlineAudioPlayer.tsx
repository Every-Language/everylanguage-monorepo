import React, { useState, useRef, useEffect, useId } from 'react';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import { useAudioPlayerStore } from '../stores/audioPlayerStore';

export interface InlineAudioPlayerProps {
  audioUrl: string;
  title?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

/**
 * Inline audio player component for playing audio tracks
 * Simple HTML5 audio player with play/pause, progress, and volume controls
 * Only one audio player can play at a time across all instances
 */
export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({
  audioUrl,
  title,
  onPlay,
  onPause,
}) => {
  const playerId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSeekingRef = useRef(false);

  const { currentPlayingId, setCurrentPlaying, pauseAll } =
    useAudioPlayerStore();

  // Pause this player if another player starts playing
  useEffect(() => {
    if (
      currentPlayingId !== null &&
      currentPlayingId !== playerId &&
      isPlaying
    ) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      onPause?.();
    }
  }, [currentPlayingId, playerId, isPlaying, onPause]);

  // Reset state when URL changes
  useEffect(() => {
    if (!audioUrl) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (currentPlayingId === playerId) {
        setCurrentPlaying(null);
      }
    }
  }, [audioUrl, currentPlayingId, playerId, setCurrentPlaying]);

  // Audio event handlers
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeeked = () => {
    // When seeking is complete, sync the time and clear seeking flag
    if (audioRef.current && isSeekingRef.current) {
      const actualTime = audioRef.current.currentTime;
      setCurrentTime(actualTime);
      setIsSeeking(false);
      isSeekingRef.current = false;
      // Clear timeout since seeked fired
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
    }
  };

  const handleTimeUpdate = () => {
    // Don't update time while user is seeking
    if (!isSeekingRef.current && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleError = () => {
    setError('Failed to load audio file');
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    onPause?.();
  };

  // Control functions
  const togglePlay = async () => {
    if (!audioRef.current || !audioUrl) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setCurrentPlaying(null);
        onPause?.();
      } else {
        // Pause all other players
        pauseAll();

        await audioRef.current.play();
        setIsPlaying(true);
        setCurrentPlaying(playerId);
        onPlay?.();
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
      setCurrentPlaying(null);
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    isSeekingRef.current = true;
  };

  // Handle seek change - this fires on both click and drag
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Set seeking flag when user starts interacting (if not already set)
    if (!isSeekingRef.current) {
      setIsSeeking(true);
      isSeekingRef.current = true;
    }

    const time = parseFloat(e.target.value);
    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, duration || 0));

    // Update state immediately for responsive UI
    setCurrentTime(clampedTime);

    // Update audio element - only if audio is ready
    if (
      audioRef.current &&
      !isNaN(audioRef.current.duration) &&
      audioRef.current.duration > 0
    ) {
      try {
        audioRef.current.currentTime = clampedTime;
      } catch (err) {
        console.error('Error seeking audio:', err);
      }
    }
  };

  const handleSeekEnd = () => {
    // Clear any existing timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    // The seeked event should handle clearing the seeking flag
    // But add a fallback timeout in case seeked doesn't fire
    seekTimeoutRef.current = setTimeout(() => {
      if (isSeekingRef.current) {
        setIsSeeking(false);
        isSeekingRef.current = false;
        // Sync with audio element one more time after seeking ends
        if (audioRef.current) {
          const actualTime = audioRef.current.currentTime;
          setCurrentTime(actualTime);
        }
      }
      seekTimeoutRef.current = null;
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (newMuted) {
      audioRef.current.volume = 0;
    } else {
      audioRef.current.volume = volume;
    }
  };

  // Format time utility
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div className='space-y-2'>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onSeeked={handleSeeked}
        onError={handleError}
        onEnded={handleEnded}
        preload='auto'
      />

      {/* Title */}
      {title && (
        <div className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
          {title}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className='text-sm text-red-600 dark:text-red-400'>{error}</div>
      )}

      {/* Controls */}
      {!error && (
        <div className='space-y-2'>
          {/* Play/Pause and Progress */}
          <div className='flex items-center gap-2'>
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className='flex-shrink-0 p-2 rounded-full bg-accent-600 hover:bg-accent-700 disabled:bg-neutral-400 text-white transition-colors'
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
              ) : isPlaying ? (
                <PauseIcon className='w-5 h-5' />
              ) : (
                <PlayIcon className='w-5 h-5' />
              )}
            </button>

            {/* Progress Bar */}
            <div className='flex-1 space-y-1'>
              <input
                type='range'
                min='0'
                max={duration || 0}
                step='0.1'
                value={isNaN(currentTime) || currentTime < 0 ? 0 : currentTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onMouseLeave={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className='w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-accent-600'
                style={{
                  background: `linear-gradient(to right, rgb(173 145 90) 0%, rgb(173 145 90) ${duration && currentTime > 0 ? (currentTime / duration) * 100 : 0}%, rgb(229 231 235) ${duration && currentTime > 0 ? (currentTime / duration) * 100 : 0}%, rgb(229 231 235) 100%)`,
                }}
              />
              <div className='flex justify-between text-xs text-neutral-500'>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className='flex items-center gap-1'>
              <button
                onClick={toggleMute}
                className='p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <SpeakerXMarkIcon className='w-4 h-4 text-neutral-600 dark:text-neutral-400' />
                ) : (
                  <SpeakerWaveIcon className='w-4 h-4 text-neutral-600 dark:text-neutral-400' />
                )}
              </button>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className='w-16 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-accent-600'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

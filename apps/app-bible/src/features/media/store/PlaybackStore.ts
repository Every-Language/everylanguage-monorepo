import React from 'react';
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // Required for devtools typing
import AsyncStorage from '@react-native-async-storage/async-storage';

// Logging configuration for this module
const ENABLE_LOGGING = true;

import type { BibleTrack, BibleAudioErrorDetails } from '../types';
import type { PlaybackRate } from '../constants/playback';

import { logger } from '@/shared/utils/logger';

// ==========================================
// Playback Store State Interface
// ==========================================

export interface PlaybackState {
  // Core playback state
  currentTrack: BibleTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isPaused: boolean;

  // Progress state
  position: number;
  duration: number;
  bufferedPosition: number;

  // Error state
  error: BibleAudioErrorDetails | null;

  // Playback preferences
  playbackRate: PlaybackRate;
}

export interface PlaybackActions {
  // ==========================================
  // Core Playback Actions
  // ==========================================

  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionSeconds: number) => Promise<void>;

  // ==========================================
  // Playback Preferences
  // ==========================================

  setPlaybackRate: (rate: PlaybackRate) => Promise<void>;

  // ==========================================
  // Internal State Updates (called by services)
  // ==========================================

  setCurrentTrack: (track: BibleTrack | null) => void;
  setPlaybackState: (state: {
    isPlaying: boolean;
    isLoading?: boolean;
    isPaused?: boolean;
  }) => void;
  updateProgress: (progress: {
    position: number;
    duration: number;
    bufferedPosition?: number;
  }) => void;
  setError: (error: BibleAudioErrorDetails | null) => void;
  clearError: () => void;

  // ==========================================
  // Initialization
  // ==========================================

  initialize: () => Promise<void>;
  destroy: () => void;
}

export type PlaybackStore = PlaybackState & PlaybackActions;

// ==========================================
// Initial State
// ==========================================

const initialState: PlaybackState = {
  // Core playback state
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  isPaused: false,

  // Progress state
  position: 0,
  duration: 0,
  bufferedPosition: 0,

  // Error state
  error: null,

  // Playback preferences
  playbackRate: 1,
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const usePlaybackStore = create<PlaybackStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ==========================================
        // Core Playback Actions Implementation
        // ==========================================

        play: async () => {
          try {
            const TrackPlayer = (await import('react-native-track-player'))
              .default;
            await TrackPlayer.play();

            // State will be updated via event listeners in MediaPlayerService
            logger.debug(
              ENABLE_LOGGING,
              '[PlaybackStore] ▶️ Play command sent'
            );
          } catch (error) {
            logger.error(ENABLE_LOGGING, '[PlaybackStore] Play error:', error);
          }
        },

        pause: async () => {
          try {
            const TrackPlayer = (await import('react-native-track-player'))
              .default;
            await TrackPlayer.pause();

            // State will be updated via event listeners in MediaPlayerService
            logger.debug(
              ENABLE_LOGGING,
              '[PlaybackStore] ⏸️ Pause command sent'
            );
          } catch (error) {
            logger.error(ENABLE_LOGGING, '[PlaybackStore] Pause error:', error);
          }
        },

        seekTo: async (positionSeconds: number) => {
          try {
            const { mediaPlayerService } = await import(
              '../services/MediaPlayerService'
            );
            await mediaPlayerService.seekTo(positionSeconds);
            logger.info(ENABLE_LOGGING, '[PlaybackStore] ⏩ Seek command sent');
          } catch (error) {
            logger.error(ENABLE_LOGGING, '[PlaybackStore] Seek error:', error);
          }
        },

        stop: async () => {
          try {
            const TrackPlayer = (await import('react-native-track-player'))
              .default;
            await TrackPlayer.stop();

            // Reset state (currentTrack will be set to null by track change event)
            set(
              {
                isPlaying: false,
                position: 0,
                duration: 0,
                bufferedPosition: 0,
              },
              undefined,
              'playback/stop'
            );

            logger.debug(
              ENABLE_LOGGING,
              '[PlaybackStore] ⏹️ Stop command sent'
            );
          } catch (error) {
            logger.error(ENABLE_LOGGING, '[PlaybackStore] Stop error:', error);
          }
        },

        // ==========================================
        // Playback Preferences
        // ==========================================

        setPlaybackRate: async (rate: PlaybackRate) => {
          try {
            const { mediaPlayerService } = await import(
              '../services/MediaPlayerService'
            );
            await mediaPlayerService.setPlaybackRate(rate);
            set({ playbackRate: rate }, undefined, 'playback/setPlaybackRate');
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[PlaybackStore] Set playback rate error:',
              error
            );
          }
        },

        // ==========================================
        // Internal State Updates
        // ==========================================

        setCurrentTrack: (track: BibleTrack | null) => {
          set(
            {
              currentTrack: track,
              isLoading: false,
              error: null,
            },
            undefined,
            'playback/setCurrentTrack'
          );

          logger.debug(
            ENABLE_LOGGING,
            '[PlaybackStore] 🎵 Current track updated:',
            track?.title || 'none'
          );
        },

        setPlaybackState: state => {
          set(
            currentState => ({
              isPlaying: state.isPlaying,
              isLoading: state.isLoading ?? currentState.isLoading,
              isPaused: state.isPaused ?? currentState.isPaused,
            }),
            undefined,
            'playback/setPlaybackState'
          );
        },

        updateProgress: progress => {
          set(
            {
              position: progress.position,
              duration: progress.duration,
              bufferedPosition:
                progress.bufferedPosition ?? get().bufferedPosition,
            },
            undefined,
            'playback/updateProgress'
          );
        },

        setError: (error: BibleAudioErrorDetails | null) => {
          set({ error, isLoading: false }, undefined, 'playback/setError');
        },

        clearError: () => {
          set({ error: null }, undefined, 'playback/clearError');
        },

        // ==========================================
        // Initialization & Cleanup
        // ==========================================

        initialize: async () => {
          try {
            logger.info(
              ENABLE_LOGGING,
              '[PlaybackStore] 🚀 Initializing playback store...'
            );

            // Note: MediaPlayerService is already initialized in App.tsx
            // No need to initialize it again here to avoid duplicate TrackPlayer setup

            logger.info(
              ENABLE_LOGGING,
              '[PlaybackStore] ✅ Playback store initialized'
            );
          } catch (error) {
            set(
              {
                error: {
                  type: 'unknown_error',
                  message: 'Failed to initialize playback store',
                  timestamp: new Date(),
                },
              },
              undefined,
              'playback/initializeError'
            );

            logger.error(
              ENABLE_LOGGING,
              '[PlaybackStore] ❌ Playback store initialization failed:',
              error
            );
            throw error;
          }
        },

        destroy: () => {
          set(
            {
              ...initialState,
            },
            undefined,
            'playback/destroy'
          );

          logger.info(
            ENABLE_LOGGING,
            '[PlaybackStore] 🧹 Playback store destroyed'
          );
        },
      }),
      {
        name: 'playback-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: state => {
          // Only persist essential playback data
          const persistData = {
            currentTrack: state.currentTrack,
            isPlaying: state.isPlaying,
            isPaused: state.isPaused,
            playbackRate: state.playbackRate,
          };

          return persistData;
        },
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            logger.info(
              ENABLE_LOGGING,
              '[PlaybackStore] Migrating persisted state from version 0 to 1'
            );
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'PlaybackStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// Core playback state
export const useCurrentTrack = () =>
  usePlaybackStore(state => state.currentTrack);

export const usePlaybackState = () => {
  const isPlaying = usePlaybackStore(state => state.isPlaying);
  const isLoading = usePlaybackStore(state => state.isLoading);
  const isPaused = usePlaybackStore(state => state.isPaused);

  return React.useMemo(
    () => ({
      isPlaying,
      isLoading,
      isPaused,
    }),
    [isPlaying, isLoading, isPaused]
  );
};

// Progress state
export const useProgress = () => {
  const position = usePlaybackStore(state => state.position);
  const duration = usePlaybackStore(state => state.duration);
  const bufferedPosition = usePlaybackStore(state => state.bufferedPosition);

  return React.useMemo(
    () => ({
      position,
      duration,
      bufferedPosition,
    }),
    [position, duration, bufferedPosition]
  );
};

// Error state
export const useError = () => usePlaybackStore(state => state.error);

// Playback rate
export const usePlaybackRate = () =>
  usePlaybackStore(state => state.playbackRate);

// ==========================================
// Action Hooks
// ==========================================

export const usePlaybackActions = () => {
  const play = usePlaybackStore(state => state.play);
  const pause = usePlaybackStore(state => state.pause);
  const stop = usePlaybackStore(state => state.stop);
  const seekTo = usePlaybackStore(state => state.seekTo);
  const setPlaybackRate = usePlaybackStore(state => state.setPlaybackRate);
  const clearError = usePlaybackStore(state => state.clearError);

  return React.useMemo(
    () => ({
      play,
      pause,
      stop,
      seekTo,
      setPlaybackRate,
      clearError,
    }),
    [play, pause, stop, seekTo, setPlaybackRate, clearError]
  );
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getPlaybackStore = () => usePlaybackStore.getState();
export const subscribeToPlaybackStore = usePlaybackStore.subscribe;

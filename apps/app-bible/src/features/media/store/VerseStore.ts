import React from 'react';
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CurrentVerseInfo } from '../types';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// ==========================================
// Verse Store State Interface
// ==========================================

export interface VerseRow {
  id: string;
  number: number;
  text?: string | undefined;
}

export interface VerseTiming {
  verse_id: string;
  start: number;
  end: number;
}

export interface VerseState {
  // Verse data (moved from useVerseData hook)
  versesByChapter: Record<string, VerseRow[]>;
  verseTimingsByChapter: Record<string, VerseTiming[]>;
  versesLoading: Record<string, boolean>;
  versesErrors: Record<string, string | null>;

  // Verse state
  currentVerse: CurrentVerseInfo | null;
  highlightedVerses: string[];
}

export interface VerseActions {
  // Verse Data Management
  setVerseData: (
    chapterId: string,
    data: { verses: VerseRow[]; timings: VerseTiming[] }
  ) => void;
  setVerseLoading: (chapterId: string, loading: boolean) => void;
  setVerseError: (chapterId: string, error: string | null) => void;
  getVerseData: (chapterId: string) => {
    verses: VerseRow[];
    timings: VerseTiming[];
    loading: boolean;
    error: string | null;
  };

  // Verse Navigation
  seekToVerse: (verseId: string) => Promise<void>;
  nextVerse: () => Promise<void>;
  previousVerse: () => Promise<void>;
  setCurrentVerse: (verse: CurrentVerseInfo | null) => void;
  setHighlightedVerses: (verses: string[]) => void;

  // Utility actions
  clearAllVerseData: () => void;
}

export type VerseStore = VerseState & VerseActions;

// ==========================================
// Initial State
// ==========================================

const initialVerseState: VerseState = {
  // Verse data
  versesByChapter: {},
  verseTimingsByChapter: {},
  versesLoading: {},
  versesErrors: {},

  // Verse state
  currentVerse: null,
  highlightedVerses: [],
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const useVerseStore = create<VerseStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialVerseState,

        // ==========================================
        // Verse Data Management Implementation
        // ==========================================

        setVerseData: (
          chapterId: string,
          data: { verses: VerseRow[]; timings: VerseTiming[] }
        ) => {
          set(
            state => ({
              versesByChapter: {
                ...state.versesByChapter,
                [chapterId]: data.verses,
              },
              verseTimingsByChapter: {
                ...state.verseTimingsByChapter,
                [chapterId]: data.timings,
              },
              versesLoading: { ...state.versesLoading, [chapterId]: false },
              versesErrors: { ...state.versesErrors, [chapterId]: null },
            }),
            undefined,
            'verse/setVerseData'
          );
          logger.debug(
            ENABLE_LOGGING,
            `[VerseStore] Set verse data for chapter ${chapterId}`,
            { verseCount: data.verses.length, timingCount: data.timings.length }
          );
        },

        setVerseLoading: (chapterId: string, loading: boolean) => {
          set(
            state => ({
              versesLoading: { ...state.versesLoading, [chapterId]: loading },
            }),
            undefined,
            'verse/setVerseLoading'
          );
        },

        setVerseError: (chapterId: string, error: string | null) => {
          set(
            state => ({
              versesErrors: { ...state.versesErrors, [chapterId]: error },
              versesLoading: { ...state.versesLoading, [chapterId]: false },
            }),
            undefined,
            'verse/setVerseError'
          );
        },

        getVerseData: (chapterId: string) => {
          const state = get();
          return {
            verses: state.versesByChapter[chapterId] || [],
            timings: state.verseTimingsByChapter[chapterId] || [],
            loading: state.versesLoading[chapterId] || false,
            error: state.versesErrors[chapterId] || null,
          };
        },

        // ==========================================
        // Verse Navigation Implementation
        // ==========================================

        seekToVerse: async (verseId: string) => {
          try {
            const { mediaPlayerService } =
              await import('../services/MediaPlayerService');
            await mediaPlayerService.seekToVerse(verseId);
            logger.info(
              ENABLE_LOGGING,
              `[VerseStore] ⏩ Seeked to verse ${verseId}`
            );
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[VerseStore] Seek to verse error:',
              error
            );
          }
        },

        nextVerse: async () => {
          try {
            const { mediaPlayerService } =
              await import('../services/MediaPlayerService');
            await mediaPlayerService.nextVerse();
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[VerseStore] Next verse error:',
              error
            );
          }
        },

        previousVerse: async () => {
          try {
            const { mediaPlayerService } =
              await import('../services/MediaPlayerService');
            await mediaPlayerService.previousVerse();
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[VerseStore] Previous verse error:',
              error
            );
          }
        },

        setCurrentVerse: (verse: CurrentVerseInfo | null) => {
          set({ currentVerse: verse }, undefined, 'verse/setCurrentVerse');
        },

        setHighlightedVerses: (verses: string[]) => {
          set(
            { highlightedVerses: verses },
            undefined,
            'verse/setHighlightedVerses'
          );
        },

        // ==========================================
        // Utility Actions
        // ==========================================

        clearAllVerseData: () => {
          set(
            {
              versesByChapter: {},
              verseTimingsByChapter: {},
              versesLoading: {},
              versesErrors: {},
              currentVerse: null,
              highlightedVerses: [],
            },
            undefined,
            'verse/clearAllVerseData'
          );
          logger.info(ENABLE_LOGGING, '[VerseStore] Cleared all verse data');
        },
      }),
      {
        name: 'verse-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: state => {
          // Only persist verse data, not loading states or current verse
          return {
            versesByChapter: state.versesByChapter,
            verseTimingsByChapter: state.verseTimingsByChapter,
            versesErrors: state.versesErrors,
          };
        },
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            logger.info(
              ENABLE_LOGGING,
              '[VerseStore] Migrating persisted state from version 0 to 1'
            );
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'VerseStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// Verse state
export const useVerseState = () => {
  const currentVerse = useVerseStore(state => state.currentVerse);
  const highlightedVerses = useVerseStore(state => state.highlightedVerses);

  return React.useMemo(
    () => ({
      currentVerse,
      highlightedVerses,
    }),
    [currentVerse, highlightedVerses]
  );
};

// Verse data by chapter (replaces useVerseData hook)
export const useVersesByChapter = (chapterId?: string | null) => {
  const versesByChapter = useVerseStore(state => state.versesByChapter);
  const verseTimingsByChapter = useVerseStore(
    state => state.verseTimingsByChapter
  );
  const versesLoading = useVerseStore(state => state.versesLoading);
  const versesErrors = useVerseStore(state => state.versesErrors);

  return React.useMemo(() => {
    if (!chapterId) {
      return { verses: [], verseTimings: [], isLoading: false, error: null };
    }

    return {
      verses: versesByChapter[chapterId] || [],
      verseTimings: verseTimingsByChapter[chapterId] || [],
      isLoading: versesLoading[chapterId] || false,
      error: versesErrors[chapterId] || null,
    };
  }, [
    chapterId,
    versesByChapter,
    verseTimingsByChapter,
    versesLoading,
    versesErrors,
  ]);
};

// Current verse info
export const useCurrentVerse = () => {
  return useVerseStore(state => state.currentVerse);
};

// Highlighted verses
export const useHighlightedVerses = () => {
  return useVerseStore(state => state.highlightedVerses);
};

// Verse loading state for a specific chapter
export const useVerseLoading = (chapterId: string) => {
  return useVerseStore(state => state.versesLoading[chapterId] || false);
};

// Verse error state for a specific chapter
export const useVerseError = (chapterId: string) => {
  return useVerseStore(state => state.versesErrors[chapterId] || null);
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getVerseStore = () => useVerseStore.getState();
export const subscribeToVerseStore = useVerseStore.subscribe;

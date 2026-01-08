import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BibleTrack, ChapterMediaOptions } from '../types';
import type { PlaylistItemQueueRef } from '@/features/playlists/types';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// ==========================================
// Queue Store State Interface
// ==========================================

export interface TrackMetadata {
  id: string;
  chapterId: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  languageEntityId: string;
  languageCode: string;
  audioVersionId: string;
  textVersionId: string;
}

// Public type for components to render queue items uniformly
export interface DisplayQueueItem {
  id: string;
  title: string;
  subtitle: string;
  chapterId: string;
  queueIndex: number;
  isManual: boolean;
  isLoaded: boolean;
}

export interface QueueItemRef {
  chapterId: string;
  audioVersionId?: string;
  textVersionId?: string;
}

export interface QueueState {
  // Queue state (consolidated from QueueManager)
  metadataQueue: TrackMetadata[];
  audioQueue: BibleTrack[];
  manualQueue: QueueItemRef[];
  playlistItemQueue: PlaylistItemQueueRef[];
  windowStartIndex: number;
  currentIndex: number;
  isQueueBuilding: boolean;
  isBuildingBackground: boolean;
}

export interface QueueActions {
  // Queue Actions
  addToQueue: (
    chapterId: string,
    options?: ChapterMediaOptions
  ) => Promise<void>;

  removeFromManualQueue: (trackId: string) => void;
  clearManualQueue: () => void;

  // Playlist Item Queue Actions
  addPlaylistItemRef: (ref: PlaylistItemQueueRef) => void;
  removePlaylistItemFromQueue: (playlistItemId: string) => void;
  clearPlaylistItemQueue: () => void;

  // Enhanced Queue Management (moved from QueueManager)
  buildMetadataQueue: (metadata: TrackMetadata[]) => void;
  addManualRef: (ref: QueueItemRef) => void;
  canPlayImmediately: (chapterId: string) => boolean;
  getCurrentQueueTrack: () => TrackMetadata | null;
  getTrackAtIndex: (index: number) => TrackMetadata | null;

  // Navigation Actions
  playTrackFromQueue: (targetIndex: number) => Promise<void>;

  // Internal State Updates (called by services)
  updateQueue: (
    queueUpdate: Partial<{
      metadataQueue: TrackMetadata[];
      audioQueue: BibleTrack[];
      playlistItemQueue: PlaylistItemQueueRef[];
      windowStartIndex: number;
      currentIndex: number;
      isQueueBuilding: boolean;
      isBuildingBackground: boolean;
    }>
  ) => void;

  consumeManualHeadIfMatches: (trackId: string) => void;
  setCurrentIndex: (index: number) => void;
}

export type QueueStore = QueueState & QueueActions;

// ==========================================
// Initial State
// ==========================================

const initialQueueState: QueueState = {
  // Queue state
  metadataQueue: [],
  audioQueue: [],
  manualQueue: [],
  playlistItemQueue: [],
  windowStartIndex: 0,
  currentIndex: 0,
  isQueueBuilding: false,
  isBuildingBackground: false,
};

// ==========================================
// Create Store with Middleware
// ==========================================

export const useQueueStore = create<QueueStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialQueueState,

        // ==========================================
        // Queue Actions Implementation
        // ==========================================

        addToQueue: async (
          chapterId: string,
          options?: ChapterMediaOptions
        ) => {
          try {
            const { mediaPlayerService } =
              await import('../services/MediaPlayerService');
            await mediaPlayerService.addToQueue(chapterId, options);
            logger.info(
              ENABLE_LOGGING,
              `[QueueStore] ➕ Added ${chapterId} to queue`
            );
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[QueueStore] Add to queue error:',
              error
            );
          }
        },

        removeFromManualQueue: (trackId: string) => {
          set(
            state => ({
              manualQueue: state.manualQueue.filter(
                ref =>
                  `chapter_${ref.chapterId}_${ref.audioVersionId ?? ''}` !==
                  trackId
              ),
            }),
            undefined,
            'queue/removeFromManualQueue'
          );

          logger.info(
            ENABLE_LOGGING,
            `[QueueStore] ➖ Removed track ${trackId} from manual queue`
          );
        },

        clearManualQueue: () => {
          set({ manualQueue: [] }, undefined, 'queue/clearManualQueue');
          logger.info(ENABLE_LOGGING, '[QueueStore] 🗑️ Cleared manual queue');
        },

        // ==========================================
        // Playlist Item Queue Actions Implementation
        // ==========================================

        addPlaylistItemRef: (ref: PlaylistItemQueueRef) => {
          set(
            state => ({
              playlistItemQueue: [...state.playlistItemQueue, ref],
            }),
            undefined,
            'queue/addPlaylistItemRef'
          );
          logger.info(
            ENABLE_LOGGING,
            '[QueueStore] ➕ Added playlist item ref to queue',
            ref
          );
        },

        removePlaylistItemFromQueue: (playlistItemId: string) => {
          set(
            state => ({
              playlistItemQueue: state.playlistItemQueue.filter(
                ref => ref.playlistItemId !== playlistItemId
              ),
            }),
            undefined,
            'queue/removePlaylistItemFromQueue'
          );

          logger.info(
            ENABLE_LOGGING,
            `[QueueStore] ➖ Removed playlist item ${playlistItemId} from queue`
          );
        },

        clearPlaylistItemQueue: () => {
          set(
            { playlistItemQueue: [] },
            undefined,
            'queue/clearPlaylistItemQueue'
          );
          logger.info(
            ENABLE_LOGGING,
            '[QueueStore] 🗑️ Cleared playlist item queue'
          );
        },

        // ==========================================
        // Enhanced Queue Management Implementation
        // ==========================================

        buildMetadataQueue: (metadata: TrackMetadata[]) => {
          // Clear old state completely first
          set(
            state => ({
              ...state,
              metadataQueue: [],
              currentIndex: 0,
            }),
            false, // Skip persistence to avoid conflicts
            'queue/clearMetadataQueue'
          );

          // Force set new metadata queue immediately
          set(
            state => ({
              ...state,
              metadataQueue: [...metadata], // Create fresh array
              currentIndex: 0,
            }),
            undefined, // Allow persistence
            'queue/buildMetadataQueue'
          );

          logger.info(
            ENABLE_LOGGING,
            `[QueueStore] 📋 Built metadata queue: ${metadata.length} tracks`
          );

          // Store the correct metadata for conflict resolution
          const correctMetadata = [...metadata];

          // Continuous persistence conflict detection
          const checkInterval = setInterval(() => {
            const verifyState = get();
            if (
              correctMetadata.length > 0 &&
              verifyState.metadataQueue.length > 0 &&
              verifyState.metadataQueue[0]?.chapterId !==
                correctMetadata[0]?.chapterId
            ) {
              // Fix the conflict immediately
              set(
                { metadataQueue: [...correctMetadata], currentIndex: 0 },
                undefined,
                'queue/fixPersistenceConflict'
              );
            }
          }, 500); // Check every 500ms

          // Stop checking after 10 seconds (queue should be stable by then)
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 10000);
        },

        addManualRef: (ref: QueueItemRef) => {
          set(
            state => ({
              manualQueue: [...state.manualQueue, ref],
            }),
            undefined,
            'queue/addManualRef'
          );
          logger.info(
            ENABLE_LOGGING,
            '[QueueStore] ➕ Added manual ref to queue',
            ref
          );
        },

        canPlayImmediately: (chapterId: string) => {
          const state = get();
          return state.audioQueue.some(
            (track: BibleTrack) => track.chapterId === chapterId
          );
        },

        getCurrentQueueTrack: () => {
          const state = get();
          return state.metadataQueue[state.currentIndex] || null;
        },

        getTrackAtIndex: (index: number) => {
          const state = get();
          return state.metadataQueue[index] || null;
        },

        // ==========================================
        // Navigation Actions Implementation
        // ==========================================

        playTrackFromQueue: async (targetIndex: number) => {
          try {
            const { mediaPlayerService } =
              await import('../services/MediaPlayerService');
            await mediaPlayerService.playTrackFromQueue(targetIndex);
            logger.info(
              ENABLE_LOGGING,
              `[QueueStore] 🎵 Playing track ${targetIndex} from queue`
            );
          } catch (error) {
            logger.error(
              ENABLE_LOGGING,
              '[QueueStore] Play from queue error:',
              error
            );
          }
        },

        // ==========================================
        // Internal State Updates
        // ==========================================

        updateQueue: queueUpdate => {
          set(
            state => ({
              ...state,
              ...queueUpdate,
            }),
            undefined,
            'queue/updateQueue'
          );
        },

        consumeManualHeadIfMatches: (trackId: string) => {
          set(
            state => {
              const head = state.manualQueue[0];
              if (!head) return state as unknown as QueueState; // no change
              const headId = `chapter_${head.chapterId}_${head.audioVersionId ?? ''}`;
              if (headId !== trackId) return state as unknown as QueueState;
              const mq = state.manualQueue.slice(1);
              logger.info(
                ENABLE_LOGGING,
                '[QueueStore] 🧹 Consumed manual head',
                { trackId }
              );
              return { ...state, manualQueue: mq } as unknown as QueueState;
            },
            undefined,
            'queue/consumeManualHeadIfMatches'
          );
        },

        setCurrentIndex: (index: number) => {
          set({ currentIndex: index }, undefined, 'queue/setCurrentIndex');
        },
      }),
      {
        name: 'queue-storage',
        storage: createJSONStorage(() => AsyncStorage),
        partialize: state => {
          // Only persist essential queue data
          const persistData = {
            manualQueue: state.manualQueue,
            metadataQueue: state.metadataQueue,
            currentIndex: state.currentIndex,
          };

          return persistData;
        },
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            logger.info(
              ENABLE_LOGGING,
              '[QueueStore] Migrating persisted state from version 0 to 1'
            );
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'QueueStore',
      enabled: __DEV__, // Only enable devtools in development
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

// Queue state
export const useQueueState = () => {
  const metadataQueue = useQueueStore(state => state.metadataQueue);
  const audioQueue = useQueueStore(state => state.audioQueue);
  const manualQueue = useQueueStore(state => state.manualQueue);
  const playlistItemQueue = useQueueStore(state => state.playlistItemQueue);
  const windowStartIndex = useQueueStore(state => state.windowStartIndex);
  const currentIndex = useQueueStore(state => state.currentIndex);
  const isQueueBuilding = useQueueStore(state => state.isQueueBuilding);
  const isBuildingBackground = useQueueStore(
    state => state.isBuildingBackground
  );

  return {
    metadataQueue,
    audioQueue,
    manualQueue,
    playlistItemQueue,
    windowStartIndex,
    currentIndex,
    isQueueBuilding,
    isBuildingBackground,
  };
};

// Enhanced queue tracks with computed properties
export const useQueueTracks = () => {
  const metadataQueue = useQueueStore(state => state.metadataQueue);
  const audioQueue = useQueueStore(state => state.audioQueue);
  const windowStartIndex = useQueueStore(state => state.windowStartIndex);
  const currentIndex = useQueueStore(state => state.currentIndex);

  const upNextMetadata = metadataQueue.slice(currentIndex);

  return upNextMetadata.map((metadata, relativeIndex) => {
    const absoluteIndex = currentIndex + relativeIndex;
    const isInSlidingWindow =
      absoluteIndex >= windowStartIndex &&
      absoluteIndex < windowStartIndex + audioQueue.length;

    return {
      id: metadata.id,
      title: metadata.title,
      subtitle: metadata.subtitle,
      chapterId: metadata.chapterId,
      queueIndex: absoluteIndex,
      isLoaded: isInSlidingWindow,
      isManual: false, // Auto-generated tracks
    };
  });
};

// Merged display queue per Spotify semantics
export const useDisplayQueue = () => {
  const metadataQueue = useQueueStore(state => state.metadataQueue);
  const manualQueue = useQueueStore(state => state.manualQueue);
  const audioQueue = useQueueStore(state => state.audioQueue);
  const windowStartIndex = useQueueStore(state => state.windowStartIndex);
  const currentIndex = useQueueStore(state => state.currentIndex);

  const idFor = (chapterId: string, audioVersionId?: string) =>
    `chapter_${chapterId}_${audioVersionId ?? ''}`;

  // Manual items: prefer audioQueue (built tracks) for display title/subtitle
  const manual = manualQueue.map(ref => {
    const id = idFor(ref.chapterId, ref.audioVersionId);
    const built = audioQueue.find(t => t.id === id);
    const fromMeta = metadataQueue.find(
      m =>
        m.chapterId === ref.chapterId &&
        m.audioVersionId === (ref.audioVersionId || m.audioVersionId)
    );
    return {
      id,
      title: built?.title || fromMeta?.title || `Chapter ${ref.chapterId}`,
      subtitle:
        built?.subtitle || fromMeta?.subtitle || `${ref.audioVersionId ?? ''}`,
      chapterId: ref.chapterId,
      isManual: true,
      metaIndex: metadataQueue.findIndex(m => m.chapterId === ref.chapterId),
    };
  });

  // Autoplay items: only show NEXT up, exclude the head (previously played or currently active manual case)
  const tail = metadataQueue.slice(currentIndex + 1).map((m, i) => ({
    id: idFor(m.chapterId, m.audioVersionId),
    title: m.title,
    subtitle: m.subtitle,
    chapterId: m.chapterId,
    isManual: false,
    metaIndex: currentIndex + 1 + i,
  }));

  // Merge with dedupe (manual-first)
  const merged = [...manual, ...tail];
  const seen = new Set<string>();
  const deduped = merged.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Compute isLoaded by mapping into current window
  const windowEnd = windowStartIndex + audioQueue.length;
  return deduped.map((item, idx) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    chapterId: item.chapterId,
    // queueIndex corresponds to metadata index when available; undefined for manual-only
    queueIndex:
      typeof item.metaIndex === 'number' && item.metaIndex >= 0
        ? item.metaIndex
        : currentIndex + 1 + idx,
    isManual: item.isManual,
    isLoaded:
      typeof item.metaIndex === 'number' && item.metaIndex >= 0
        ? item.metaIndex >= windowStartIndex && item.metaIndex < windowEnd
        : audioQueue.some(t => t.id === item.id),
  })) as unknown as DisplayQueueItem[];
};

// Current queue track info
export const useCurrentQueueTrack = () => {
  const metadataQueue = useQueueStore(state => state.metadataQueue);
  const currentIndex = useQueueStore(state => state.currentIndex);

  return metadataQueue[currentIndex] || null;
};

// Queue statistics for UI
export const useQueueStats = () => {
  const metadataQueue = useQueueStore(state => state.metadataQueue);
  const audioQueue = useQueueStore(state => state.audioQueue);
  const manualQueue = useQueueStore(state => state.manualQueue);
  const isQueueBuilding = useQueueStore(state => state.isQueueBuilding);
  const isBuildingBackground = useQueueStore(
    state => state.isBuildingBackground
  );

  return {
    totalTracks: metadataQueue.length,
    loadedTracks: audioQueue.length,
    manualTracks: manualQueue.length,
    isBuilding: isQueueBuilding || isBuildingBackground,
  };
};

// ==========================================
// Store Instance Access (for services)
// ==========================================

export const getQueueStore = () => useQueueStore.getState();
export const subscribeToQueueStore = useQueueStore.subscribe;

// Re-export types for convenience
export type { PlaylistItemQueueRef } from '@/features/playlists/types';

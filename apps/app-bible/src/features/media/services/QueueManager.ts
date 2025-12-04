import TrackPlayer from 'react-native-track-player';
import EventEmitter from 'eventemitter3';
import { logger } from '@/shared/utils/logger';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TrackBuilder } from './TrackBuilder';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { getQueueStore, type QueueItemRef } from '../store/QueueStore';
import { queueOrchestrator } from './QueueOrchestrator';
import { trackCacheService } from './TrackCacheService';
import { playlistQueueService } from '@/features/playlists/services/PlaylistQueueService';
import type { BibleTrack } from '../types';
import type {
  PlaylistItem,
  PlaylistItemQueueRef,
} from '@/features/playlists/types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Minimal abort types to avoid dependency and linter issues
type SimpleAbortSignal = { aborted?: boolean };
type SimpleAbortController = { abort: () => void; signal: SimpleAbortSignal };

export interface ChapterMediaOptions {
  preferOffline?: boolean;
  audioVersionId?: string;
  textVersionId?: string;
  languageEntityId?: string;
}

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

export interface QueueBuildParams {
  startChapterId: string;
  bookIds?: string[];
  maxTracks?: number;
  direction?: 'forward' | 'backward' | 'both';
}

export interface QueueState {
  metadataQueue: TrackMetadata[]; // Full queue for UI (100+ tracks)
  audioQueue: BibleTrack[]; // RNTP queue (12-15 tracks optimized)
  manualQueue: QueueItemRef[]; // Store refs
  playlistItemQueue: PlaylistItemQueueRef[]; // Playlist item refs
  windowStartIndex: number; // Where audio window starts in metadata
  currentIndex: number; // Current position in metadata queue
  isBuilding: boolean;
  isBuildingBackground: boolean; // Background queue building
}

/**
 * OptimizedQueueManager - Sliding window queue for instant playback
 */
export class QueueManager {
  private static instance: QueueManager;
  private performanceMonitor = PerformanceMonitor.getInstance();
  private trackBuilder = new TrackBuilder();
  private eventEmitter = new EventEmitter();

  private readonly WINDOW_SIZE = 14; // Optimized for ~40min of audio
  // Use shared TrackCacheService for built tracks
  // backgroundBuildCache removed in favor of shared cache

  static getInstance(): QueueManager {
    if (!this.instance) {
      this.instance = new QueueManager();
    }
    return this.instance;
  }

  private constructor() {
    // QueueManager is now stateless - all state managed by Zustand store
    this.monitorAbortController = null;
    this.buildAbortController = null;
    this.isBuildingWindow = false;
  }

  private monitorAbortController: SimpleAbortController | null = null;
  private buildAbortController: SimpleAbortController | null = null;
  private isBuildingWindow = false;

  /**
   * Build queue with instant playback - first track loads immediately
   */
  async buildQueue(params: QueueBuildParams): Promise<void> {
    const startTime = this.performanceMonitor.startTiming('queueBuild');

    try {
      getQueueStore().updateQueue({ isQueueBuilding: true });
      logger.info(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] 🚀 Building optimized queue...'
      );

      // Phase 1: Build the first track immediately (parallelizable)
      const firstTrackTime = this.performanceMonitor.startTiming('firstTrack');
      const firstTrackPromise = this.buildFirstTrackDirect(
        params.startChapterId
      ).then(() => {
        this.performanceMonitor.endTiming('firstTrack', firstTrackTime);
        this.notifyStateChange();
        logger.info(
          ENABLE_LOGGING,
          `[OptimizedQueueManager] ⚡ First track ready for instant play`
        );
      });

      // Phase 2: Build metadata queue in parallel
      const metadataStartTime =
        this.performanceMonitor.startTiming('metadataBuild');
      const metadataPromise = this.buildMetadataQueue(params)
        .then(metadata => {
          getQueueStore().buildMetadataQueue(metadata);
          this.performanceMonitor.endTiming('metadataBuild', metadataStartTime);

          // Find starting index for the requested chapter
          const startIndex = this.findChapterIndex(params.startChapterId);
          getQueueStore().updateQueue({ currentIndex: startIndex });

          // Phase 3: Build rest of window in background (non-blocking)
          const g = globalThis as {
            AbortController?: new () => SimpleAbortController;
          };
          const signal = g.AbortController
            ? new g.AbortController().signal
            : ({} as SimpleAbortSignal);
          this.buildRemainingWindowInBackgroundDebounced(
            startIndex,
            signal
          ).catch((error: unknown) => {
            logger.warn(
              ENABLE_LOGGING,
              '[OptimizedQueueManager] Background window building failed:',
              error
            );
          });

          // Phase 4: Build remaining queue in background (non-blocking)
          this.buildRemainingQueueInBackground(params).catch(
            (error: unknown) => {
              logger.warn(
                ENABLE_LOGGING,
                '[OptimizedQueueManager] Background queue building failed:',
                error
              );
            }
          );
        })
        .catch((error: unknown) => {
          logger.error(
            ENABLE_LOGGING,
            '[OptimizedQueueManager] Metadata build failed:',
            error
          );
          throw error;
        });

      // Wait for first track readiness or metadata completion, whichever first
      await Promise.race([firstTrackPromise, metadataPromise]);
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] Queue build failed:',
        error
      );
      throw error;
    } finally {
      getQueueStore().updateQueue({ isQueueBuilding: false });
      this.performanceMonitor.endTiming('queueBuild', startTime);
    }
  }

  /**
   * Build metadata queue quickly from database
   */
  private async buildMetadataQueue(
    params: QueueBuildParams
  ): Promise<TrackMetadata[]> {
    const db = powerSyncSystem.database;
    if (!db) {
      throw new Error('PowerSync not initialized');
    }

    const { useVersionsStore } = await import(
      '@/features/languages/store/versionsStore'
    );
    const { currentAudioVersion, currentTextVersion } =
      useVersionsStore.getState();

    if (!currentAudioVersion || !currentTextVersion) {
      logger.warn(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] No current versions set, cannot build queue'
      );
      return [];
    }

    const startChapterResult = await db.execute(
      'SELECT book_id, chapter_number FROM chapters WHERE id = ?',
      [params.startChapterId]
    );

    if (!startChapterResult.rows?._array?.[0]) {
      throw new Error(`Starting chapter not found: ${params.startChapterId}`);
    }

    const startChapter = startChapterResult.rows._array[0];
    const startBookId = startChapter.book_id;
    const startChapterNum = startChapter.chapter_number;

    logger.info(
      ENABLE_LOGGING,
      '[OptimizedQueueManager] Building queue starting from:',
      {
        chapterId: params.startChapterId,
        bookId: startBookId,
        chapterNumber: startChapterNum,
      }
    );

    // Get the remaining chapters in the current book
    const query = `
      SELECT 
        c.id as chapterId,
        c.chapter_number,
        c.book_id,
        b.name as book_name,
        b.global_order
      FROM chapters c
      JOIN books b ON c.book_id = b.id  
      WHERE c.book_id = ? AND c.chapter_number >= ?
        AND EXISTS (SELECT 1 FROM media_files mf WHERE mf.chapter_id = c.id)
      ORDER BY c.chapter_number
      LIMIT ?
    `;

    const maxTracks = params.maxTracks || 150;
    const results = await db.execute(query, [
      startBookId,
      startChapterNum,
      maxTracks,
    ]);

    if (!results.rows?._array) {
      return [];
    }

    // Get cached language info and use it for the subtitle
    const languageCode = currentAudioVersion.name || 'Audio Bible';

    return results.rows._array.map(
      (row: {
        chapterId: string;
        chapter_number: number;
        book_id: string;
        book_name: string;
      }) => ({
        id: `chapter_${row.chapterId}_${currentAudioVersion.id}`,
        chapterId: row.chapterId,
        bookId: row.book_id,
        chapterNumber: row.chapter_number,
        title: `${row.book_name} ${row.chapter_number}`,
        subtitle: `${languageCode}`,
        languageEntityId: currentAudioVersion.languageEntityId,
        languageCode: languageCode,
        audioVersionId: currentAudioVersion.id,
        textVersionId: currentTextVersion.id,
      })
    );
  }

  // Removed legacy buildFirstTrackOnly; we now build directly by chapterId

  /**
   * Build first track directly from chapterId (no metadata dependency)
   */
  private async buildFirstTrackDirect(chapterId: string): Promise<void> {
    // Resolve current versions
    const { useVersionsStore } = await import(
      '@/features/languages/store/versionsStore'
    );
    const { currentAudioVersion, currentTextVersion } =
      useVersionsStore.getState();

    const options: ChapterMediaOptions = {
      preferOffline: true,
      ...(currentAudioVersion?.id
        ? { audioVersionId: currentAudioVersion.id }
        : {}),
      ...(currentTextVersion?.id
        ? { textVersionId: currentTextVersion.id }
        : {}),
    };

    const track = await this.trackBuilder.buildChapterTrack(chapterId, options);
    if (!track) return;

    // Update store with single-track window (index will be corrected after metadata)
    const store = getQueueStore();
    store.updateQueue({ audioQueue: [track], windowStartIndex: 0 });
    await TrackPlayer.setQueue([track]);
  }

  private async buildRemainingWindowInBackgroundDebounced(
    centerIndex: number,
    signal: SimpleAbortSignal
  ): Promise<void> {
    if (this.buildAbortController) {
      this.buildAbortController.abort();
      logger.debug(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] 🚫 Cancelled previous build operation'
      );
    }

    const AC1 = globalThis as {
      AbortController?: new () => SimpleAbortController;
    };
    this.buildAbortController = AC1.AbortController
      ? new AC1.AbortController()
      : { abort: () => {}, signal: {} };
    this.isBuildingWindow = true;

    try {
      if (signal.aborted) return;

      const store = getQueueStore();
      const startIndex = Math.max(
        0,
        centerIndex - Math.floor(this.WINDOW_SIZE / 2)
      );
      const endIndex = Math.min(
        store.metadataQueue.length - 1,
        startIndex + this.WINDOW_SIZE - 1
      );

      logger.info(
        ENABLE_LOGGING,
        `[OptimizedQueueManager] 🔄 Building remaining window in background (debounced)...`
      );

      const tracks: BibleTrack[] = [];

      for (let i = startIndex; i <= endIndex; i++) {
        if (signal.aborted || this.buildAbortController?.signal.aborted) {
          logger.debug(
            ENABLE_LOGGING,
            '[OptimizedQueueManager] 🚫 Build cancelled during track building'
          );
          return;
        }

        const metadata = store.metadataQueue[i];
        if (metadata && i !== centerIndex) {
          // Skip first track - already built
          // Check cache first
          let track = trackCacheService.get(metadata.id);

          if (!track) {
            track = await this.buildTrackWithAudio(metadata);

            if (signal.aborted || this.buildAbortController?.signal.aborted) {
              logger.debug(
                ENABLE_LOGGING,
                '[OptimizedQueueManager] 🚫 Build cancelled after track build'
              );
              return;
            }
          }

          if (track) {
            tracks.push(track);
          }
        } else if (i === centerIndex && store.audioQueue.length > 0) {
          // Add first track from current queue
          const firstTrack = store.audioQueue[0];
          if (firstTrack) {
            tracks.push(firstTrack);
          }
        }
      }

      if (signal.aborted || this.buildAbortController?.signal.aborted) {
        logger.debug(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] 🚫 Build cancelled before applying changes'
        );
        return;
      }

      // Insert manual tracks after current track (index 0), before auto-generated tracks
      const finalTracks: BibleTrack[] = [];
      if (tracks.length > 0 && tracks[0]) {
        finalTracks.push(tracks[0]); // Current track
        // Manual queue now refs; skip inserting here. Orchestrator maintains the true RNTP window.
        finalTracks.push(...tracks.slice(1)); // Auto-generated tracks after manual
      }

      store.updateQueue({
        audioQueue: finalTracks,
        windowStartIndex: startIndex,
      });

      // Orchestrator is authoritative for RNTP window application

      logger.info(
        ENABLE_LOGGING,
        `[OptimizedQueueManager] ✅ Window complete (debounced): ${startIndex}-${endIndex} (${finalTracks.length} tracks total: ${store.manualQueue.length} manual + ${tracks.length - 1} auto)`
      );

      this.eventEmitter.emit('queueUpdated', {
        trackCount: finalTracks.length,
        windowSize: endIndex - startIndex + 1,
        manualQueueSize: store.manualQueue.length,
      });
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError' || signal?.aborted) {
        logger.debug(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] 🚫 Build operation was cancelled'
        );
        return;
      }
      logger.error(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] ❌ Error building window (debounced):',
        error
      );
    } finally {
      this.isBuildingWindow = false;
      this.buildAbortController = null;
    }
  }

  /**
   * Build single track with full audio data
   * Public method for use by QueueWatcher and other services
   */
  async buildTrackWithAudio(
    metadata: TrackMetadata
  ): Promise<BibleTrack | undefined> {
    const options: ChapterMediaOptions = {
      preferOffline: true,
      audioVersionId: metadata.audioVersionId,
      textVersionId: metadata.textVersionId,
    };

    const track = await this.trackBuilder.buildChapterTrack(
      metadata.chapterId,
      options
    );

    if (!track) {
      logger.warn(
        ENABLE_LOGGING,
        `[OptimizedQueueManager] ⚠️ Skipping chapter ${metadata.chapterId} - no media files available`
      );
    }

    return track;
  }

  /**
   * Background building of remaining tracks (non-blocking)
   */
  private async buildRemainingQueueInBackground(
    _params: QueueBuildParams
  ): Promise<void> {
    const store = getQueueStore();
    store.updateQueue({ isBuildingBackground: true });

    try {
      logger.info(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] 🔄 Starting background queue building...'
      );

      const totalTracks = store.metadataQueue.length;
      const windowEnd = store.windowStartIndex + this.WINDOW_SIZE;

      const tracksToPreload: TrackMetadata[] = [];

      if (windowEnd < totalTracks) {
        const nextWindowStart = windowEnd;
        const nextWindowEnd = Math.min(
          totalTracks - 1,
          nextWindowStart + this.WINDOW_SIZE - 1
        );

        for (let i = nextWindowStart; i <= nextWindowEnd; i++) {
          const metadata = store.metadataQueue[i];
          if (metadata && !trackCacheService.get(metadata.id)) {
            tracksToPreload.push(metadata);
          }
        }
      }

      const windowStart = store.windowStartIndex;
      if (windowStart > 0) {
        const prevWindowEnd = windowStart - 1;
        const prevWindowStart = Math.max(
          0,
          prevWindowEnd - this.WINDOW_SIZE + 1
        );

        for (let i = prevWindowStart; i <= prevWindowEnd; i++) {
          const metadata = store.metadataQueue[i];
          if (metadata && !trackCacheService.get(metadata.id)) {
            tracksToPreload.push(metadata);
          }
        }
      }

      // Build tracks in small batches to avoid blocking
      const BATCH_SIZE = 3;
      for (let i = 0; i < tracksToPreload.length; i += BATCH_SIZE) {
        const batch = tracksToPreload.slice(i, i + BATCH_SIZE);

        // Build batch concurrently
        const batchPromises = batch.map(async metadata => {
          try {
            const track = await this.buildTrackWithAudio(metadata);
            if (track) {
              trackCacheService.set(metadata.id, track);
            }
          } catch (error) {
            logger.warn(
              ENABLE_LOGGING,
              `[OptimizedQueueManager] Failed to cache ${metadata.title}:`,
              error
            );
          }
        });

        await Promise.all(batchPromises);

        // Small delay between batches to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      logger.info(
        ENABLE_LOGGING,
        `[OptimizedQueueManager] ✅ Background building complete`
      );
    } finally {
      store.updateQueue({ isBuildingBackground: false });
    }
  }

  /**
   * Find chapter index in metadata queue
   */
  private findChapterIndex(chapterId: string): number {
    const store = getQueueStore();
    const index = store.metadataQueue.findIndex(
      track => track.chapterId === chapterId
    );

    if (index === -1) {
      logger.error(
        ENABLE_LOGGING,
        `[OptimizedQueueManager] ❌ Chapter ${chapterId} not found in metadata queue`
      );
      // Return 0 as fallback instead of -1 to avoid queue issues
      return 0;
    }

    return index;
  }

  /**
   * Monitor track changes and trigger sliding window movement when needed
   */
  async monitorAndMoveWindow(): Promise<void> {
    // ✅ PHASE 1: Cancel any ongoing monitor operation
    if (this.monitorAbortController) {
      this.monitorAbortController.abort();
      logger.debug(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] 🚫 Cancelled previous monitor operation'
      );
    }

    const AC2 = globalThis as {
      AbortController?: new () => SimpleAbortController;
    };
    this.monitorAbortController = AC2.AbortController
      ? new AC2.AbortController()
      : { abort: () => {}, signal: {} };
    const signal = this.monitorAbortController.signal;

    try {
      if (signal?.aborted) return;

      if (this.isBuildingWindow) {
        logger.debug(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] ⏳ Window already building, skipping monitor'
        );
        return;
      }

      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex === null || activeIndex === undefined) return;
      if (signal?.aborted) return; // Check again after async call

      const windowSize = 14;
      const bufferSize = 5; // Trigger rebuild when within 5 tracks of window edge

      const store = getQueueStore();
      const currentWindowStart = store.windowStartIndex ?? 0;
      const currentWindowEnd = currentWindowStart + windowSize - 1;

      // FIND CURRENT TRACK IN METADATA QUEUE
      const rnptQueue = await TrackPlayer.getQueue();
      if (signal?.aborted) return; // Check after async call

      const currentTrack = rnptQueue[activeIndex];

      if (!currentTrack) return;

      // Find this track's position in metadata queue
      const metadataIndex = store.metadataQueue.findIndex(
        (metadata: TrackMetadata) =>
          currentTrack['id'] ===
          `chapter_${metadata.chapterId}_${metadata.audioVersionId}`
      );

      if (metadataIndex === -1) {
        logger.warn(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] ⚠️ Current track not found in metadata queue'
        );
        return;
      }

      const shouldRebuildWindow =
        metadataIndex < currentWindowStart + bufferSize || // Too close to start
        metadataIndex > currentWindowEnd - bufferSize || // Too close to end
        metadataIndex >= store.metadataQueue.length; // Beyond metadata

      if (shouldRebuildWindow && store.metadataQueue.length > windowSize) {
        // ✅ PHASE 1: Final check before starting expensive operation
        if (signal?.aborted || this.isBuildingWindow) return;

        logger.info(
          ENABLE_LOGGING,
          `[OptimizedQueueManager] 🔄 Auto-moving sliding window: metadata=${metadataIndex}, window=${currentWindowStart}-${currentWindowEnd}`
        );

        // Calculate new window start (keep current track in middle)
        const newWindowStart = Math.max(
          0,
          metadataIndex - Math.floor(windowSize / 2)
        );
        const maxStart = Math.max(0, store.metadataQueue.length - windowSize);
        const finalWindowStart = Math.min(newWindowStart, maxStart);

        await this.buildRemainingWindowInBackgroundDebounced(
          finalWindowStart,
          signal
        );
      }
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError' || signal?.aborted) {
        logger.debug(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] 🚫 Monitor operation was cancelled'
        );
        return;
      }
      logger.error(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] ❌ Error monitoring window movement:',
        error
      );
    } finally {
      if (this.monitorAbortController?.signal === signal) {
        this.monitorAbortController = null;
      }
    }
  }

  getQueueState(): QueueState {
    const store = getQueueStore();
    return {
      metadataQueue: store.metadataQueue,
      audioQueue: store.audioQueue,
      manualQueue: store.manualQueue,
      playlistItemQueue: store.playlistItemQueue,
      windowStartIndex: store.windowStartIndex,
      currentIndex: store.currentIndex,
      isBuilding: store.isQueueBuilding,
      isBuildingBackground: store.isBuildingBackground,
    };
  }

  getCurrentTrack(): TrackMetadata | null {
    return getQueueStore().getCurrentQueueTrack();
  }

  getTrackAtIndex(index: number): TrackMetadata | null {
    return getQueueStore().getTrackAtIndex(index);
  }

  // Check if track can be played immediately (in current audio queue)
  canPlayImmediately(chapterId: string): boolean {
    return getQueueStore().canPlayImmediately(chapterId);
  }

  async addToQueue(
    chapterId: string,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] ➕ Adding manual ref',
        {
          chapterId,
          audioVersionId: options.audioVersionId,
          textVersionId: options.textVersionId,
        }
      );

      const ref: QueueItemRef = {
        chapterId,
        ...(options.audioVersionId
          ? { audioVersionId: options.audioVersionId }
          : {}),
        ...(options.textVersionId
          ? { textVersionId: options.textVersionId }
          : {}),
      };
      getQueueStore().addManualRef(ref);

      await queueOrchestrator.ensureWindow();

      const store = getQueueStore();
      this.eventEmitter.emit('queueUpdated', {
        trackCount: store.audioQueue.length,
        windowSize: this.WINDOW_SIZE,
        manualQueueSize: store.manualQueue.length,
        playlistItemQueueSize: store.playlistItemQueue.length,
      });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[OptimizedQueueManager] ❌ Failed to add manual ref:',
        error
      );
      throw error;
    }
  }

  /**
   * Add playlist item to manual queue - delegated to PlaylistQueueService
   */
  async addPlaylistItemToQueue(
    playlistItem: PlaylistItem,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    // Delegate to PlaylistQueueService
    await playlistQueueService.addPlaylistItemToQueue(playlistItem, options);

    // Emit event for queue updates
    const store = getQueueStore();
    this.eventEmitter.emit('queueUpdated', {
      trackCount: store.audioQueue.length,
      windowSize: this.WINDOW_SIZE,
      manualQueueSize: store.manualQueue.length,
      playlistItemQueueSize: store.playlistItemQueue.length,
    });
  }

  removeFromManualQueue(trackId: string): void {
    const store = getQueueStore();
    const initialLength = store.manualQueue.length;

    store.removeFromManualQueue(trackId);

    if (store.manualQueue.length < initialLength) {
      // Rebuild current window without the removed track
      this.rebuildCurrentWindow().catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] Failed to rebuild window after manual track removal:',
          error
        );
      });
    }
  }

  clearManualQueue(): void {
    const store = getQueueStore();
    if (store.manualQueue.length > 0) {
      store.clearManualQueue();

      this.rebuildCurrentWindow().catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          '[OptimizedQueueManager] Failed to rebuild window after clearing manual queue:',
          error
        );
      });
    }
  }

  getManualQueue(): QueueItemRef[] {
    return [...getQueueStore().manualQueue];
  }

  getPlaylistItemQueue(): PlaylistItemQueueRef[] {
    return playlistQueueService.getPlaylistItemQueue();
  }

  removePlaylistItemFromQueue(playlistItemId: string): void {
    playlistQueueService.removePlaylistItemFromQueue(playlistItemId);
  }

  clearPlaylistItemQueue(): void {
    playlistQueueService.clearPlaylistItemQueue();
  }

  /**
   * Rebuild current RNTP window to include manual tracks
   * Called when manual queue changes to update the actual playable queue
   */
  private async rebuildCurrentWindow(): Promise<void> {
    await queueOrchestrator.ensureWindow();
  }

  private notifyStateChange(): void {
    this.eventEmitter.emit('queueStateChanged', this.getQueueState());
  }

  onQueueStateChanged(callback: (state: QueueState) => void): () => void {
    this.eventEmitter.addListener('queueStateChanged', callback);

    return () => {
      this.eventEmitter.removeListener('queueStateChanged', callback);
    };
  }

  onQueueUpdated(
    callback: (data: { trackCount: number; windowSize: number }) => void
  ): () => void {
    this.eventEmitter.addListener('queueUpdated', callback);

    return () => {
      this.eventEmitter.removeListener('queueUpdated', callback);
    };
  }

  destroy(): void {
    // no backgroundBuildCache to clear
    this.eventEmitter.removeAllListeners();
    logger.info(ENABLE_LOGGING, '[OptimizedQueueManager] Destroyed');
  }
}

import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import {
  getPlaybackStore,
  subscribeToPlaybackStore,
} from '../store/PlaybackStore';
import { getVerseStore } from '../store/VerseStore';
import { queryLogger } from '@/shared/utils/queryLogger';
import { QUERIES } from '@/shared/constants/queries';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

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

/**
 * VerseDataService - Handles all verse data loading and management
 * Replaces the business logic from useVerseData hook with proper service-layer architecture
 */
export class VerseDataService {
  private static instance: VerseDataService;
  private unsubscribeFromStore: (() => void) | null = null;
  private unsubscribeFromVersionsStore: (() => void) | null = null;

  public static getInstance(): VerseDataService {
    if (!VerseDataService.instance) {
      VerseDataService.instance = new VerseDataService();
    }
    return VerseDataService.instance;
  }

  private constructor() {
    this.setupStoreSubscription();
    this.setupVersionsStoreSubscription();
  }

  /**
   * Set up subscription to store changes for automatic verse data loading
   */
  private setupStoreSubscription(): void {
    let previousChapterId: string | null = null;

    this.unsubscribeFromStore = subscribeToPlaybackStore(state => {
      const currentChapterId = state.currentTrack?.chapterId || null;

      // Only load if chapter actually changed
      if (currentChapterId !== previousChapterId) {
        previousChapterId = currentChapterId;

        if (currentChapterId) {
          this.loadVerseDataForCurrentTrack().catch(error => {
            logger.warn(
              ENABLE_LOGGING,
              '[VerseDataService] Failed to auto-load verse data:',
              error
            );
          });
        }
      }
    });

    logger.info(
      ENABLE_LOGGING,
      '[VerseDataService] Store subscription established'
    );
  }

  /**
   * Subscribe to versions store readiness and selection changes so we can
   * load verses once a text version becomes available after app restore.
   */
  private setupVersionsStoreSubscription(): void {
    try {
      const vs = useVersionsStore.getState();
      let lastReady = !!vs.isReady;
      let lastTextVersionId = vs.currentTextVersion?.id ?? null;

      this.unsubscribeFromVersionsStore = useVersionsStore.subscribe(state => {
        const nowReady = !!state.isReady;
        const textVersionId = state.currentTextVersion?.id ?? null;

        const becameReady = !lastReady && nowReady;
        const textChanged = textVersionId !== lastTextVersionId;

        lastReady = nowReady;
        lastTextVersionId = textVersionId;

        // When versions become ready or text version changes, (re)load verses for current track
        // Only act once PowerSync is initialized to avoid "database not initialized" errors
        if (
          powerSyncSystem.isInitialized &&
          nowReady &&
          (becameReady || textChanged) &&
          textVersionId
        ) {
          const playbackStore = getPlaybackStore();
          const verseStore = getVerseStore();
          const chapterId = playbackStore.currentTrack?.chapterId;
          if (chapterId) {
            // If text version changed, clear existing cache so UI reflects new text immediately
            if (textChanged) {
              try {
                verseStore.setVerseError(chapterId, null);
                verseStore.setVerseData(chapterId, { verses: [], timings: [] });
                verseStore.setVerseLoading(chapterId, true);
              } catch (e) {
                logger.warn(
                  ENABLE_LOGGING,
                  '[VerseDataService] Failed to clear verse data for chapter:',
                  e
                );
              }
            }

            this.loadVerseData(chapterId, textVersionId).catch(error => {
              logger.warn(
                ENABLE_LOGGING,
                '[VerseDataService] Failed to load verses after versions ready:',
                error
              );
            });
          }
        }
      });

      logger.info(
        ENABLE_LOGGING,
        '[VerseDataService] Versions store subscription established'
      );
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '[VerseDataService] Failed to create versions store subscription',
        error
      );
    }
  }

  /**
   * Load verse data for the currently playing track
   */
  async loadVerseDataForCurrentTrack(): Promise<void> {
    const playbackStore = getPlaybackStore();
    const currentTrack = playbackStore.currentTrack;

    if (!currentTrack?.chapterId) {
      logger.debug(
        ENABLE_LOGGING,
        '[VerseDataService] No current track, skipping verse data load'
      );
      return;
    }

    // Ensure DB is ready before touching versions store
    if (!powerSyncSystem.isInitialized) {
      logger.debug(
        ENABLE_LOGGING,
        '[VerseDataService] PowerSync not initialized yet'
      );
      return;
    }

    // Get current text version
    const versionsStore = useVersionsStore.getState();

    if (!versionsStore.isReady) {
      logger.debug(
        ENABLE_LOGGING,
        '[VerseDataService] Versions store not ready, refreshing...'
      );
      // Only refresh when DB is initialized (guarded above)
      versionsStore.refresh();
      return;
    }

    const currentTextVersion = versionsStore.currentTextVersion;
    if (!currentTextVersion?.id) {
      logger.warn(
        ENABLE_LOGGING,
        '[VerseDataService] No current text version available'
      );
      return;
    }

    await this.loadVerseData(currentTrack.chapterId, currentTextVersion.id);
  }

  /**
   * Load verse data for a specific chapter and text version
   * Gets audio version from versionsStore automatically
   */
  async loadVerseData(chapterId: string, textVersionId: string): Promise<void> {
    if (!powerSyncSystem.isInitialized) {
      logger.debug(
        ENABLE_LOGGING,
        '[VerseDataService] PowerSync not initialized yet'
      );
      return;
    }

    // Get current audio version from versionsStore
    const versionsStore = useVersionsStore.getState();
    const audioVersionId = versionsStore.currentAudioVersion?.id;

    if (!audioVersionId) {
      logger.debug(
        ENABLE_LOGGING,
        '[VerseDataService] No audio version selected, skipping verse data load'
      );
      return;
    }

    const verseStore = getVerseStore();
    const cacheKey = `${chapterId}_${textVersionId}`;

    // Check if we already have this data
    const existingData = verseStore.getVerseData(chapterId);
    if (existingData.verses.length > 0 && !existingData.error) {
      logger.debug(
        ENABLE_LOGGING,
        `[VerseDataService] Verse data already loaded for ${cacheKey}`
      );
      return;
    }

    logger.info(
      ENABLE_LOGGING,
      `[VerseDataService] Loading verse data for ${cacheKey} (audio: ${audioVersionId})`
    );
    verseStore.setVerseLoading(chapterId, true);

    try {
      // ✅ OPTIMIZED: Single combined query with JOINs
      // Includes deleted_at filters and audio_version_id filter for performance
      // Always filters to current audio version for correctness and performance
      const results = await queryLogger.logQuery(
        'verse-data-service',
        QUERIES.VERSES_WITH_TIMING,
        async () => {
          return await powerSyncSystem.getAll(QUERIES.VERSES_WITH_TIMING, [
            textVersionId,
            chapterId,
            audioVersionId,
            chapterId,
          ]);
        }
      );

      // Process results
      const verseMap = new Map<string, VerseRow>();
      const timingMap = new Map<string, VerseTiming>();

      (
        results as Array<{
          verse_id: string;
          verse_number: number;
          verse_text?: string;
          start_time_seconds?: number;
          duration_seconds?: number;
          media_file_id?: string;
        }>
      ).forEach(row => {
        // Build verse data
        if (!verseMap.has(row.verse_id)) {
          verseMap.set(row.verse_id, {
            id: row.verse_id,
            number: row.verse_number,
            text: row.verse_text || undefined,
          });
        }

        // Build timing data
        if (
          row.start_time_seconds !== null &&
          row.start_time_seconds !== undefined &&
          row.duration_seconds !== null &&
          row.duration_seconds !== undefined &&
          !timingMap.has(row.verse_id)
        ) {
          timingMap.set(row.verse_id, {
            verse_id: row.verse_id,
            start: row.start_time_seconds,
            end: row.start_time_seconds + row.duration_seconds,
          });
        }
      });

      const verses = Array.from(verseMap.values()).sort(
        (a, b) => a.number - b.number
      );
      const timings = Array.from(timingMap.values()).sort(
        (a, b) => a.start - b.start
      );

      // ✅ UPDATE STORE: Single source of truth
      verseStore.setVerseData(chapterId, { verses, timings });

      logger.info(
        ENABLE_LOGGING,
        `[VerseDataService] ✅ Loaded ${verses.length} verses, ${timings.length} timings for ${chapterId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load verse data';
      verseStore.setVerseError(chapterId, errorMessage);
      logger.error(
        ENABLE_LOGGING,
        '[VerseDataService] ❌ Failed to load verse data:',
        error
      );
    }
  }

  /**
   * Preload verse data for specific chapter (for performance optimization)
   */
  async preloadVerseData(chapterId: string): Promise<void> {
    const versionsStore = useVersionsStore.getState();
    const currentTextVersion = versionsStore.currentTextVersion;

    if (!currentTextVersion?.id) {
      logger.warn(
        ENABLE_LOGGING,
        '[VerseDataService] No text version for preloading'
      );
      return;
    }

    logger.debug(
      ENABLE_LOGGING,
      `[VerseDataService] Preloading verse data for ${chapterId}`
    );
    await this.loadVerseData(chapterId, currentTextVersion.id);
  }

  /**
   * Force reload verse data (for refresh scenarios)
   */
  async reloadVerseData(chapterId: string): Promise<void> {
    const verseStore = getVerseStore();

    // Clear existing data to force reload
    verseStore.setVerseError(chapterId, null);
    verseStore.setVerseData(chapterId, { verses: [], timings: [] });

    await this.loadVerseDataForCurrentTrack();
  }

  /**
   * Get cache statistics for performance monitoring
   */
  getCacheStats() {
    const verseStore = getVerseStore();
    return {
      totalChapters: Object.keys(verseStore.versesByChapter).length,
      loadingChapters: Object.values(verseStore.versesLoading).filter(Boolean)
        .length,
      errorChapters: Object.values(verseStore.versesErrors).filter(Boolean)
        .length,
    };
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }
    if (this.unsubscribeFromVersionsStore) {
      this.unsubscribeFromVersionsStore();
      this.unsubscribeFromVersionsStore = null;
    }
    logger.info(ENABLE_LOGGING, '[VerseDataService] Service destroyed');
  }
}

// Export singleton instance
export const verseDataService = VerseDataService.getInstance();

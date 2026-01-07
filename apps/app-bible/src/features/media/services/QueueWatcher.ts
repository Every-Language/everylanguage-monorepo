import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import { getQueueStore } from '../store/QueueStore';
import { getPlaybackStore } from '../store/PlaybackStore';
import { QueueManager } from './QueueManager';
import type { BibleTrack } from '../types';
import type { TrackMetadata } from '../store/QueueStore';

const ENABLE_LOGGING = false;

/**
 * QueueWatcher - Monitors RNTP queue and adds tracks incrementally
 * instead of rebuilding the entire queue. Now event-driven for better performance.
 */
export class QueueWatcher {
  private static instance: QueueWatcher;
  private isWatching = false;
  private safetyInterval: ReturnType<typeof setInterval> | null = null;
  private queueManager = QueueManager.getInstance();

  // Configuration
  private readonly MIN_REMAINING_TRACKS = 3; // Trigger refill when less than 3 tracks remain
  private readonly MAX_QUEUE_SIZE = 50; // Prevent unlimited queue growth
  private readonly SAFETY_INTERVAL = 30000; // Safety check every 30 seconds for edge cases
  private readonly BATCH_SIZE = 5; // Add tracks in batches of 5

  // Track change handling
  private isHistoryNavigating = false;

  // Analytics deduplication
  private recentAnalyticsEvents = new Map<string, number>();
  private readonly ANALYTICS_DEDUP_WINDOW = 5000; // 5 seconds deduplication window

  private constructor() {}

  static getInstance(): QueueWatcher {
    if (!QueueWatcher.instance) {
      QueueWatcher.instance = new QueueWatcher();
    }
    return QueueWatcher.instance;
  }

  /**
   * Start monitoring the queue and refilling when needed
   * Now event-driven: responds to track changes instead of polling
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      logger.debug(ENABLE_LOGGING, '[QueueWatcher] Already watching');
      return;
    }

    this.isWatching = true;
    logger.info(
      ENABLE_LOGGING,
      '[QueueWatcher] Starting event-driven queue monitoring'
    );

    // Initial check
    await this.checkAndRefillQueue();

    // Set up safety interval for edge cases (much less frequent)
    this.safetyInterval = setInterval(async () => {
      try {
        await this.checkAndRefillQueue();
        logger.debug(ENABLE_LOGGING, '[QueueWatcher] Safety check completed');
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[QueueWatcher] Error during safety check:',
          error
        );
      }
    }, this.SAFETY_INTERVAL);
  }

  /**
   * Stop monitoring the queue
   */
  stopWatching(): void {
    if (!this.isWatching) return;

    this.isWatching = false;
    if (this.safetyInterval) {
      clearInterval(this.safetyInterval);
      this.safetyInterval = null;
    }

    logger.info(ENABLE_LOGGING, '[QueueWatcher] Stopped queue monitoring');
  }

  /**
   * Check if queue needs refilling and add tracks if necessary
   */
  private async checkAndRefillQueue(): Promise<void> {
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (
        currentIndex === null ||
        currentIndex === undefined ||
        currentIndex < 0
      ) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] No active track, skipping check'
        );
        return;
      }

      // Check if we have more tracks available in metadataQueue
      const store = getQueueStore();
      const nextIndex = currentIndex + 1;
      const hasMoreTracks = store.metadataQueue[nextIndex] !== undefined;

      if (!hasMoreTracks) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] No more tracks available in metadataQueue - reached end of playlist'
        );
        return;
      }

      const remaining = queue.length - (currentIndex + 1);

      logger.debug(ENABLE_LOGGING, '[QueueWatcher] Queue status check', {
        currentIndex,
        queueLength: queue.length,
        remaining,
        minRequired: this.MIN_REMAINING_TRACKS,
        hasMoreTracks,
      });

      if (remaining < this.MIN_REMAINING_TRACKS && hasMoreTracks) {
        await this.addMoreTracksToEnd();
      }

      // Also check if queue is getting too large and needs trimming
      if (queue.length > this.MAX_QUEUE_SIZE) {
        await this.trimQueueFromBeginning();
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueWatcher] Error checking queue:',
        error
      );
    }
  }

  /**
   * Add more tracks to the end of the queue
   */
  private async addMoreTracksToEnd(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '[QueueWatcher] Adding more tracks to queue end'
      );

      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (currentIndex === null || currentIndex === undefined) {
        logger.warn(
          ENABLE_LOGGING,
          '[QueueWatcher] Cannot add tracks - no active track'
        );
        return;
      }

      // Check if we have more tracks available before attempting to add
      const store = getQueueStore();
      const nextIndex = currentIndex + 1;

      if (store.metadataQueue[nextIndex] === undefined) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] No more tracks available - skipping add operation'
        );
        return;
      }

      // Calculate what tracks we need to add
      const tracksToAdd = await this.getNextTracksToAdd(
        nextIndex,
        this.BATCH_SIZE
      );

      if (tracksToAdd.length > 0) {
        await TrackPlayer.add(tracksToAdd);

        logger.info(
          ENABLE_LOGGING,
          '[QueueWatcher] Added tracks to queue end',
          {
            count: tracksToAdd.length,
            firstTrack: tracksToAdd[0]?.title,
            lastTrack: tracksToAdd[tracksToAdd.length - 1]?.title,
          }
        );
      } else {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] No tracks were built - likely reached end of available tracks'
        );
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueWatcher] Error adding tracks to end:',
        error
      );
    }
  }

  /**
   * Get the next tracks that should be added to the queue
   */
  private async getNextTracksToAdd(
    startIndex: number,
    count: number
  ): Promise<BibleTrack[]> {
    const store = getQueueStore();
    const tracks: BibleTrack[] = [];

    // Get tracks from the metadata queue
    for (let i = 0; i < count; i++) {
      const index = startIndex + i;
      const metadata = store.metadataQueue[index];

      if (!metadata) {
        // No more tracks available
        break;
      }

      // Build the track
      const track = await this.buildTrackFromMetadata(metadata);
      if (track) {
        tracks.push(track);
      }
    }

    return tracks;
  }

  /**
   * Build a track from metadata using QueueManager's track building
   */
  private async buildTrackFromMetadata(
    metadata: TrackMetadata
  ): Promise<BibleTrack | null> {
    try {
      // ✅ Use QueueManager's existing track building method
      const track = await this.queueManager.buildTrackWithAudio(metadata);
      return track || null;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueWatcher] Error building track:',
        error
      );
      return null;
    }
  }

  /**
   * Trim the queue from the beginning to prevent unlimited growth
   */
  private async trimQueueFromBeginning(): Promise<void> {
    try {
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (
        currentIndex === null ||
        currentIndex === undefined ||
        currentIndex < 0
      )
        return;

      // Keep some tracks before current position for skipToPrevious
      const KEEP_BEFORE_CURRENT = 5;
      const trimFromIndex = Math.max(0, currentIndex - KEEP_BEFORE_CURRENT);

      if (trimFromIndex > 0) {
        const indicesToRemove = Array.from(
          { length: trimFromIndex },
          (_, i) => i
        );
        await TrackPlayer.remove(indicesToRemove);

        logger.info(
          ENABLE_LOGGING,
          '[QueueWatcher] Trimmed queue from beginning',
          { removedCount: trimFromIndex }
        );
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueWatcher] Error trimming queue:',
        error
      );
    }
  }

  /**
   * Force a queue check (useful for testing or manual triggers)
   */
  async forceCheck(): Promise<void> {
    await this.checkAndRefillQueue();
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<{
    totalTracks: number;
    currentIndex: number;
    remainingTracks: number;
    isWatching: boolean;
  }> {
    const queue = await TrackPlayer.getQueue();
    const currentIndex = await TrackPlayer.getActiveTrackIndex();

    return {
      totalTracks: queue.length,
      currentIndex: currentIndex ?? -1,
      remainingTracks: queue.length - ((currentIndex ?? 0) + 1),
      isWatching: this.isWatching,
    };
  }

  /**
   * Handle track change and coordinate all necessary operations
   * (consolidated from TrackChangeStateMachine)
   */
  async handleTrackChange(
    newTrackId: string | null,
    prevTrackId: string | null
  ): Promise<void> {
    try {
      logger.debug(ENABLE_LOGGING, '[QueueWatcher] Handling track change', {
        newTrackId,
        prevTrackId,
      });

      // ✅ Skip track change handling if this is likely an app state transition
      // The session/history services should handle current track restoration
      if (newTrackId === null && prevTrackId === null) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] Skipping track change - likely app state transition'
        );
        return;
      }

      // 1. Finalize previous track progress
      if (prevTrackId) {
        const { progressTrackingService } =
          await import('./ProgressTrackingService');
        await progressTrackingService.finalizeTrackProgress(prevTrackId);
      }

      // 2. Update current track in store (only for real track changes)
      if (newTrackId !== null) {
        await this.updateCurrentTrack(newTrackId);

        // 2a. Add track to history when it starts playing
        try {
          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();
          if (
            currentIndex !== null &&
            currentIndex !== undefined &&
            queue[currentIndex]
          ) {
            const track = queue[currentIndex] as BibleTrack;

            // Get languageEntityId from current audio version (already in memory)
            const { useVersionsStore } =
              await import('@/features/languages/store/versionsStore');
            const { currentAudioVersion } = useVersionsStore.getState();
            const languageEntityId =
              currentAudioVersion?.languageEntityId || '';

            // DEBUG: Log what we got from versions store
            logger.info(ENABLE_LOGGING, '[QueueWatcher] Versions store data:', {
              currentAudioVersion: currentAudioVersion
                ? {
                    id: currentAudioVersion.id,
                    name: currentAudioVersion.name,
                    languageEntityId: currentAudioVersion.languageEntityId,
                    languageName: currentAudioVersion.languageName,
                  }
                : null,
              extractedLanguageEntityId: languageEntityId,
              trackAudioVersionId: track.audioVersionId,
            });

            // Create enhanced track object with languageEntityId
            const enhancedTrack = {
              ...track,
              languageEntityId,
            };

            // DEBUG: Log the enhanced track object being passed to history
            logger.info(
              ENABLE_LOGGING,
              '[QueueWatcher] Enhanced track for history:',
              {
                originalTrack: {
                  id: track.id,
                  title: track.title,
                  audioVersionId: track.audioVersionId,
                  chapterId: track.chapterId,
                  duration: track.duration,
                },
                enhancedTrack: {
                  id: enhancedTrack.id,
                  title: enhancedTrack.title,
                  audioVersionId: enhancedTrack.audioVersionId,
                  chapterId: enhancedTrack.chapterId,
                  languageEntityId: enhancedTrack.languageEntityId,
                  duration: enhancedTrack.duration,
                },
              }
            );

            const { historyManager } = await import('./HistoryManager');
            await historyManager.addToHistory(enhancedTrack);
            logger.info(
              ENABLE_LOGGING,
              `[QueueWatcher] ✅ Added track to history: ${track.title} (${languageEntityId || 'no language'})`
            );
          }
        } catch (error) {
          // Non-fatal error - don't break track change handling
          logger.warn(
            ENABLE_LOGGING,
            '[QueueWatcher] Failed to add track to history:',
            error
          );
        }

        // 2b. Trigger analytics for the new track
        await this.triggerAnalyticsForTrack(newTrackId);
      }

      // 3. Handle history navigation if needed
      if (this.isHistoryNavigating) {
        await this.handleHistoryNavigation(newTrackId);
      }

      // 4. Sync app state with RNTP
      const { queueSynchronizer } = await import('./QueueSynchronizer');
      await queueSynchronizer.syncAppStateWithRNTP();

      // 5. Check if more tracks are needed (event-driven refill)
      await this.forceCheck();

      // 6. Clear history navigation flag
      if (this.isHistoryNavigating) {
        this.isHistoryNavigating = false;
      }

      logger.info(
        ENABLE_LOGGING,
        '[QueueWatcher] Event-driven track change completed successfully',
        { newTrackId, prevTrackId }
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueWatcher] Track change failed:',
        error
      );
      throw error;
    }
  }

  /**
   * Update current track in playback store
   */
  private async updateCurrentTrack(trackId: string | null): Promise<void> {
    if (trackId) {
      const { queueSynchronizer } = await import('./QueueSynchronizer');
      const currentTrack = await queueSynchronizer.getCurrentTrackFromRNTP();
      getPlaybackStore().setCurrentTrack(currentTrack);
    } else {
      // This should only be called for real track changes, not app state transitions
      getPlaybackStore().setCurrentTrack(null);
    }
  }

  /**
   * Handle history navigation
   */
  private async handleHistoryNavigation(trackId: string | null): Promise<void> {
    if (!trackId) return;

    const { queueSynchronizer } = await import('./QueueSynchronizer');
    const currentTrack = await queueSynchronizer.getCurrentTrackFromRNTP();

    if (!currentTrack) {
      // Track not found in current queue, need to rebuild
      logger.info(
        ENABLE_LOGGING,
        '[QueueWatcher] History navigation - track not found, rebuilding queue'
      );
      const { queueOrchestrator } = await import('./QueueOrchestrator');
      await queueOrchestrator.ensureWindow();
    } else {
      // Track found, just sync state
      await queueSynchronizer.syncAppStateWithRNTP();
    }
  }

  /**
   * Trigger analytics events for a track change
   */
  private async triggerAnalyticsForTrack(trackId: string): Promise<void> {
    try {
      // Get the current track from the playback store
      const { getPlaybackStore } = await import('../store/PlaybackStore');
      const currentTrack = getPlaybackStore().currentTrack;

      if (!currentTrack) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueWatcher] No current track for analytics'
        );
        return;
      }

      // Import AnalyticsService
      const { AnalyticsService } = await import('@/features/analytics');
      const now = Date.now();

      // Trigger chapter listen analytics with deduplication
      if (currentTrack.chapterId) {
        const chapterEventKey = `chapter:${currentTrack.chapterId}`;
        const lastRecorded = this.recentAnalyticsEvents.get(chapterEventKey);

        if (!lastRecorded || now - lastRecorded > this.ANALYTICS_DEDUP_WINDOW) {
          logger.debug(
            ENABLE_LOGGING,
            '[QueueWatcher] Triggering chapter listen analytics',
            {
              chapterId: currentTrack.chapterId,
              trackId: trackId,
            }
          );

          // Use void to avoid awaiting - analytics should be fire-and-forget
          void AnalyticsService.recordChapterListen(
            currentTrack.chapterId,
            undefined // languageEntityId will be resolved by AnalyticsService
          );

          // Record this event to prevent duplicates
          this.recentAnalyticsEvents.set(chapterEventKey, now);
        } else {
          logger.debug(
            ENABLE_LOGGING,
            '[QueueWatcher] Skipping duplicate chapter listen analytics',
            {
              chapterId: currentTrack.chapterId,
              timeSinceLastRecorded: now - lastRecorded,
            }
          );
        }
      }

      // Trigger media file listen analytics for each media file with deduplication
      if (currentTrack.mediaFiles && currentTrack.mediaFiles.length > 0) {
        for (const mediaFile of currentTrack.mediaFiles) {
          if (mediaFile.id) {
            const mediaEventKey = `media:${mediaFile.id}`;
            const lastRecorded = this.recentAnalyticsEvents.get(mediaEventKey);

            if (
              !lastRecorded ||
              now - lastRecorded > this.ANALYTICS_DEDUP_WINDOW
            ) {
              logger.debug(
                ENABLE_LOGGING,
                '[QueueWatcher] Triggering media file listen analytics',
                {
                  mediaFileId: mediaFile.id,
                  trackId: trackId,
                }
              );

              // Use void to avoid awaiting - analytics should be fire-and-forget
              void AnalyticsService.recordMediaFileListen(mediaFile.id);

              // Record this event to prevent duplicates
              this.recentAnalyticsEvents.set(mediaEventKey, now);
            } else {
              logger.debug(
                ENABLE_LOGGING,
                '[QueueWatcher] Skipping duplicate media file listen analytics',
                {
                  mediaFileId: mediaFile.id,
                  timeSinceLastRecorded: now - lastRecorded,
                }
              );
            }
          }
        }
      }

      // Clean up old deduplication entries to prevent memory leaks
      this.cleanupOldAnalyticsEvents(now);

      logger.info(
        ENABLE_LOGGING,
        '[QueueWatcher] Analytics triggered for track change',
        {
          trackId,
          chapterId: currentTrack.chapterId,
          mediaFilesCount: currentTrack.mediaFiles?.length || 0,
        }
      );
    } catch (error) {
      // Don't throw - analytics failures shouldn't break track changes
      logger.warn(
        ENABLE_LOGGING,
        '[QueueWatcher] Failed to trigger analytics for track',
        {
          trackId,
          error,
        }
      );
    }
  }

  /**
   * Clean up old analytics deduplication entries to prevent memory leaks
   */
  private cleanupOldAnalyticsEvents(now: number): void {
    const cutoff = now - this.ANALYTICS_DEDUP_WINDOW;
    for (const [key, timestamp] of this.recentAnalyticsEvents.entries()) {
      if (timestamp < cutoff) {
        this.recentAnalyticsEvents.delete(key);
      }
    }
  }

  /**
   * Set history navigating flag
   */
  setHistoryNavigating(isNavigating: boolean): void {
    this.isHistoryNavigating = isNavigating;
    logger.debug(ENABLE_LOGGING, '[QueueWatcher] History navigating flag set', {
      isNavigating,
    });
  }
}

export const queueWatcher = QueueWatcher.getInstance();

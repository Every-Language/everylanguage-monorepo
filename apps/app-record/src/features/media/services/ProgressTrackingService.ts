import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import { historyManager } from './HistoryManager';
import { getPlaybackStore } from '../store/PlaybackStore';
import { getSessionStore } from '../store/SessionStore';
import type {
  VerseWithTiming,
  VerseChangeListener,
  BibleTrack,
} from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Service responsible for tracking playback progress, verse changes, and saving progress
 * Optimized for performance on older devices with debounced saving
 */
export class ProgressTrackingService {
  private progressSaveInterval: ReturnType<typeof setInterval> | null = null;
  private lastSavedPosition: number = 0;
  private verseChangeListeners = new Set<VerseChangeListener>();
  private readonly PROGRESS_SAVE_INTERVAL = 10000; // 10 seconds
  private readonly MIN_SAVE_THRESHOLD = 5; // Only save if position changed by 5+ seconds

  /**
   * Start periodic progress saving with optimizations for older devices
   */
  startProgressSaving(): void {
    // Clear existing interval
    this.stopProgressSaving();

    this.progressSaveInterval = setInterval(async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        const currentIndex = await TrackPlayer.getActiveTrackIndex();

        if (currentIndex === null || currentIndex === undefined) return;

        // Only save if position changed significantly (reduces database writes)
        const positionDiff = Math.abs(
          progress.position - this.lastSavedPosition
        );
        if (positionDiff < this.MIN_SAVE_THRESHOLD) return;

        // Get current track for saving state and history
        const queue = await TrackPlayer.getQueue();
        const currentTrack = queue[currentIndex] as BibleTrack | undefined;

        if (currentTrack) {
          // Update progress in store (automatically persisted via Zustand middleware)
          getPlaybackStore().updateProgress({
            position: progress.position,
            duration: progress.duration,
            bufferedPosition: progress.buffered,
          });

          // Persist coarse checkpoint approximately every 10s when we save
          try {
            getSessionStore().setLastCheckpointPosition(progress.position);
          } catch (e) {
            logger.warn(
              ENABLE_LOGGING,
              'Failed to set last checkpoint position:',
              e
            );
          }

          // Update history progress (non-blocking)
          if (currentTrack['id']) {
            const trackId = currentTrack['id'] as string;
            historyManager
              .updateHistoryProgress(
                trackId,
                progress.position,
                progress.duration
              )
              .catch((error: Error) => {
                logger.warn(
                  ENABLE_LOGGING,
                  'Failed to update history progress:',
                  error
                );
              });
          }
        }

        this.lastSavedPosition = progress.position;
      } catch (error) {
        logger.warn(ENABLE_LOGGING, 'Progress save interval error:', error);
      }
    }, this.PROGRESS_SAVE_INTERVAL);

    // Progress saving started (reduced logging)
  }

  /**
   * Stop periodic progress saving
   */
  stopProgressSaving(): void {
    if (this.progressSaveInterval) {
      clearInterval(this.progressSaveInterval);
      this.progressSaveInterval = null;
      // Progress saving stopped (reduced logging)
    }
  }

  /**
   * Save final progress when track completes or changes
   */
  async saveFinalProgress(
    trackId: string,
    position: number,
    duration: number,
    isCompleted: boolean = false
  ): Promise<void> {
    try {
      // Mark as completed in history if track finished
      if (isCompleted) {
        await historyManager.markTrackCompleted(trackId, position, duration);
      } else {
        await historyManager.updateHistoryProgress(trackId, position, duration);
      }

      logger.info(
        ENABLE_LOGGING,
        `Final progress saved for track ${trackId}: ${position}/${duration}s (completed: ${isCompleted})`
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to save final progress:', error);
    }
  }

  /**
   * Finalize progress for a track when it changes
   * (moved from TrackChangeStateMachine)
   */
  async finalizeTrackProgress(trackId: string | null): Promise<void> {
    if (!trackId) return;

    try {
      const progress = await TrackPlayer.getProgress();
      await this.saveFinalProgress(
        trackId,
        progress.position,
        progress.duration
      );

      logger.debug(
        ENABLE_LOGGING,
        '[ProgressTrackingService] Finalized track progress',
        { trackId, position: progress.position }
      );
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '[ProgressTrackingService] Failed to finalize track progress:',
        error
      );
    }
  }

  /**
   * Update current verse based on playback position
   * Optimized to reduce CPU usage on older devices
   */
  updateCurrentVerse(
    position: number,
    verses: VerseWithTiming[],
    currentVerseId: string | null
  ): string | null {
    if (!verses.length) return null;

    // Find verse for current position using binary search for performance
    let left = 0;
    let right = verses.length - 1;
    let currentVerse: VerseWithTiming | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const verse = verses[mid];
      if (!verse) break;

      const verseStart = verse.absoluteStartTime;
      const verseEnd = verseStart + verse.durationSeconds;

      if (position >= verseStart && position < verseEnd) {
        currentVerse = verse;
        break;
      } else if (position < verseStart) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // If no exact match, find the last verse that has started
    if (!currentVerse) {
      for (let i = verses.length - 1; i >= 0; i--) {
        const verse = verses[i];
        if (verse && position >= verse.absoluteStartTime) {
          currentVerse = verse;
          break;
        }
      }
    }

    const newVerseId = currentVerse?.verseId || null;

    // Only emit change if verse actually changed (reduces UI updates)
    if (newVerseId !== currentVerseId) {
      this.emitVerseChange(newVerseId, currentVerse);
    }

    return newVerseId;
  }

  /**
   * Add verse change listener
   */
  onVerseChange(listener: VerseChangeListener): () => void {
    this.verseChangeListeners.add(listener);
    return () => this.verseChangeListeners.delete(listener);
  }

  /**
   * Emit verse change to all listeners
   */
  private emitVerseChange(
    verseId: string | null,
    verse: VerseWithTiming | null
  ): void {
    this.verseChangeListeners.forEach(listener => {
      try {
        listener(verseId, verse);
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error in verse change listener:', error);
      }
    });
  }

  /**
   * Flush current progress to stores and history (used for app state changes)
   */
  async flushProgress(): Promise<void> {
    try {
      const { position, duration } = await TrackPlayer.getProgress();
      getPlaybackStore().updateProgress({
        position,
        duration,
        bufferedPosition: 0,
      });

      const queue = await TrackPlayer.getQueue();
      const idx = await TrackPlayer.getActiveTrackIndex();
      const track =
        idx !== null && idx !== undefined
          ? (queue[idx] as BibleTrack | undefined)
          : undefined;

      if (track?.id) {
        await historyManager.updateHistoryProgress(
          track.id,
          position,
          duration
        );
      }

      logger.info(ENABLE_LOGGING, 'Progress flushed to position:', position);
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        '[ProgressTrackingService] Flush progress failed:',
        e
      );
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopProgressSaving();
    this.verseChangeListeners.clear();
    logger.info(ENABLE_LOGGING, 'ProgressTrackingService destroyed');
  }
}

// Export singleton instance
export const progressTrackingService = new ProgressTrackingService();

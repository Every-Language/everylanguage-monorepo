import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import { getPlaybackStore } from '../store/PlaybackStore';
import { getQueueStore } from '../store/QueueStore';
import type { BibleTrack } from '../types';

const ENABLE_LOGGING = false;

/**
 * QueueSynchronizer - Keeps app state synchronized with RNTP's actual queue state
 * This replaces the need for constant queue rebuilding
 */
export class QueueSynchronizer {
  private static instance: QueueSynchronizer;

  private constructor() {}

  static getInstance(): QueueSynchronizer {
    if (!QueueSynchronizer.instance) {
      QueueSynchronizer.instance = new QueueSynchronizer();
    }
    return QueueSynchronizer.instance;
  }

  /**
   * Synchronize app state with RNTP's current queue state
   * This is called after track changes to keep everything in sync
   */
  async syncAppStateWithRNTP(): Promise<void> {
    try {
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();

      if (
        currentIndex === null ||
        currentIndex === undefined ||
        currentIndex < 0 ||
        !queue[currentIndex]
      ) {
        logger.debug(
          ENABLE_LOGGING,
          '[QueueSynchronizer] No active track, clearing current track'
        );
        getPlaybackStore().setCurrentTrack(null);
        return;
      }

      const currentTrack = queue[currentIndex] as BibleTrack;

      logger.debug(
        ENABLE_LOGGING,
        '[QueueSynchronizer] Syncing app state with RNTP',
        {
          currentIndex,
          trackId: currentTrack.id,
          trackTitle: currentTrack.title,
          queueLength: queue.length,
        }
      );

      // Update playback store with current track
      getPlaybackStore().setCurrentTrack(currentTrack);

      // Update queue store with current index (currentIndex is guaranteed to be number here)
      getQueueStore().setCurrentIndex(currentIndex);

      // Update queue store with actual queue contents
      getQueueStore().updateQueue({
        audioQueue: queue as BibleTrack[],
        windowStartIndex: currentIndex,
      });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueSynchronizer] Error syncing app state:',
        error
      );
    }
  }

  /**
   * Get the current track from RNTP (not from app state)
   */
  async getCurrentTrackFromRNTP(): Promise<BibleTrack | null> {
    try {
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();

      if (
        currentIndex === null ||
        currentIndex === undefined ||
        currentIndex < 0 ||
        !queue[currentIndex]
      ) {
        return null;
      }

      return queue[currentIndex] as BibleTrack;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueSynchronizer] Error getting current track from RNTP:',
        error
      );
      return null;
    }
  }

  /**
   * Get the current index from RNTP (not from app state)
   */
  async getCurrentIndexFromRNTP(): Promise<number> {
    try {
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      return currentIndex ?? -1;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueSynchronizer] Error getting current index from RNTP:',
        error
      );
      return -1;
    }
  }

  /**
   * Check if app state matches RNTP state
   */
  async isAppStateInSync(): Promise<boolean> {
    try {
      const rntpIndex = await this.getCurrentIndexFromRNTP();
      const rntpTrack = await this.getCurrentTrackFromRNTP();

      const appIndex = getQueueStore().currentIndex;
      const appTrack = getPlaybackStore().currentTrack;

      const indexMatches = rntpIndex === appIndex;
      const trackMatches = rntpTrack?.id === appTrack?.id;

      logger.debug(ENABLE_LOGGING, '[QueueSynchronizer] Sync check', {
        rntpIndex,
        appIndex,
        indexMatches,
        rntpTrackId: rntpTrack?.id,
        appTrackId: appTrack?.id,
        trackMatches,
        inSync: indexMatches && trackMatches,
      });

      return indexMatches && trackMatches;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[QueueSynchronizer] Error checking sync state:',
        error
      );
      return false;
    }
  }

  /**
   * Force synchronization if app state is out of sync
   */
  async forceSyncIfNeeded(): Promise<void> {
    const isInSync = await this.isAppStateInSync();

    if (!isInSync) {
      logger.info(
        ENABLE_LOGGING,
        '[QueueSynchronizer] App state out of sync, forcing sync'
      );
      await this.syncAppStateWithRNTP();
    }
  }

  /**
   * Get queue statistics for debugging
   */
  async getQueueStats(): Promise<{
    rntpIndex: number;
    rntpTrackId: string | null;
    appIndex: number;
    appTrackId: string | null;
    queueLength: number;
    isInSync: boolean;
  }> {
    const rntpIndex = await this.getCurrentIndexFromRNTP();
    const rntpTrack = await this.getCurrentTrackFromRNTP();
    const appIndex = getQueueStore().currentIndex;
    const appTrack = getPlaybackStore().currentTrack;
    const queue = await TrackPlayer.getQueue();
    const isInSync = await this.isAppStateInSync();

    return {
      rntpIndex,
      rntpTrackId: rntpTrack?.id || null,
      appIndex,
      appTrackId: appTrack?.id || null,
      queueLength: queue.length,
      isInSync,
    };
  }
}

export const queueSynchronizer = QueueSynchronizer.getInstance();

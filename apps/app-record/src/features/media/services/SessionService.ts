import TrackPlayer from 'react-native-track-player';
import { getPlaybackStore } from '../store/PlaybackStore';
import { getSessionStore } from '../store/SessionStore';
import { getQueueStore } from '../store/QueueStore';
import { QueueManager } from './QueueManager';
import { queueOrchestrator } from './QueueOrchestrator';
import { verseDataService } from './VerseDataService';
import { logger } from '@/shared/utils/logger';
import type { BibleTrack, ChapterMediaOptions } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * SessionService - Handles session restoration and checkpoint management
 * Separated from MediaPlayerService to maintain single responsibility principle
 */
export class SessionService {
  private optimizedQueueManager = QueueManager.getInstance();

  /**
   * Restore previously persisted session: rebuild RNTP, seek to saved position, start paused.
   */
  async restoreSession(): Promise<void> {
    const playbackStore = getPlaybackStore();
    const sessionStore = getSessionStore();
    const persistedTrack = playbackStore.currentTrack;
    const savedPosition = sessionStore.lastCheckpointPosition;

    if (!persistedTrack) {
      logger.info(
        ENABLE_LOGGING,
        '[SessionService] No persisted session to restore'
      );
      return;
    }

    logger.info(ENABLE_LOGGING, '[SessionService] Restoring session...', {
      track: persistedTrack.title,
      position: savedPosition,
      manualQueueSize: getQueueStore().manualQueue.length,
      metadataSize: getQueueStore().metadataQueue.length,
    });

    try {
      // Ensure we have metadata; if empty, rebuild minimal metadata for the chapter's book
      await this.rebuildMetadataIfNeeded(persistedTrack);

      // Ensure RNTP window reflects store
      await queueOrchestrator.ensureWindow();

      // Map ID to RNTP index and restore playback position
      await this.restorePlaybackPosition(persistedTrack, savedPosition);

      // Ensure paused on open
      await TrackPlayer.pause();

      // Kick verse data load for current track
      await verseDataService.loadVerseDataForCurrentTrack().catch(() => {});

      logger.info(ENABLE_LOGGING, '[SessionService] ✅ Session restored');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[SessionService] ❌ Error restoring session:',
        error
      );
      throw error;
    }
  }

  /**
   * Rebuild metadata queue if empty
   */
  private async rebuildMetadataIfNeeded(
    persistedTrack: BibleTrack
  ): Promise<void> {
    if (getQueueStore().metadataQueue.length === 0) {
      logger.info(
        ENABLE_LOGGING,
        '[SessionService] Rebuilding metadata queue for restore'
      );

      const metadata = await this.buildMetadataQueue(persistedTrack.chapterId);
      if (Array.isArray(metadata)) {
        getQueueStore().buildMetadataQueue(metadata as unknown as never);

        // Position index to the persisted chapter if present
        const idx = getQueueStore().metadataQueue.findIndex(
          m => m.chapterId === persistedTrack.chapterId
        );
        if (idx >= 0) {
          getQueueStore().updateQueue({ currentIndex: idx });
        }
      }
    }
  }

  /**
   * Build metadata queue for a chapter
   */
  private async buildMetadataQueue(chapterId: string): Promise<unknown> {
    return await (
      this.optimizedQueueManager as unknown as {
        buildMetadataQueue: (p: {
          startChapterId: string;
          maxTracks?: number;
        }) => Promise<unknown>;
      }
    ).buildMetadataQueue({
      startChapterId: chapterId,
      maxTracks: 150,
    });
  }

  /**
   * Restore playback position by finding track in queue or rebuilding it
   */
  private async restorePlaybackPosition(
    persistedTrack: BibleTrack,
    savedPosition: number
  ): Promise<void> {
    // Map ID to RNTP index
    const rQueue = await TrackPlayer.getQueue();
    const desiredId = persistedTrack.id;
    let idx = rQueue.findIndex(t => t['id'] === desiredId);

    // If not found, try rebuilding first track directly
    if (idx === -1) {
      logger.info(
        ENABLE_LOGGING,
        '[SessionService] Restoring: injecting first track directly'
      );

      const built = await this.buildChapterTrack(persistedTrack.chapterId);
      if (built) {
        await TrackPlayer.setQueue([built]);
        idx = 0;
      }
    }

    // Skip and seek
    if (idx >= 0) {
      await TrackPlayer.skip(idx);
      const clamped = Math.max(
        0,
        Math.min(savedPosition, persistedTrack.duration ?? savedPosition)
      );
      if (clamped > 0) {
        await TrackPlayer.seekTo(clamped);
      }
    }
  }

  /**
   * Build a chapter track using current versions
   */
  private async buildChapterTrack(
    chapterId: string
  ): Promise<BibleTrack | undefined> {
    // Build by chapterId using current versions
    const { useVersionsStore } =
      await import('@/features/languages/store/versionsStore');
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

    return await (
      this.optimizedQueueManager as unknown as {
        trackBuilder: {
          buildChapterTrack: (
            chapterId: string,
            opts: ChapterMediaOptions
          ) => Promise<BibleTrack | undefined>;
        };
      }
    ).trackBuilder.buildChapterTrack(chapterId, options);
  }

  /**
   * Save session checkpoint with current position
   */
  async saveSessionCheckpoint(): Promise<void> {
    try {
      const { position } = await TrackPlayer.getProgress();
      getSessionStore().setLastCheckpointPosition(position);
      logger.debug(
        ENABLE_LOGGING,
        '[SessionService] Session checkpoint saved:',
        position
      );
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '[SessionService] Failed to save session checkpoint:',
        error
      );
    }
  }

  /**
   * Clear expired session data
   */
  async clearExpiredSession(): Promise<void> {
    const sessionStore = getSessionStore();
    if (sessionStore.isSessionExpired()) {
      logger.info(ENABLE_LOGGING, '[SessionService] Clearing expired session');
      sessionStore.clearExpiredSession();
    }
  }

  /**
   * Check if session restoration is needed
   */
  shouldRestoreSession(): boolean {
    const playbackStore = getPlaybackStore();
    const sessionStore = getSessionStore();

    return !!(
      playbackStore.currentTrack &&
      sessionStore.lastCheckpointPosition > 0 &&
      !sessionStore.isSessionExpired()
    );
  }
}

export const sessionService = new SessionService();

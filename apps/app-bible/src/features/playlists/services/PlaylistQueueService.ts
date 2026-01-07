import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import { mediaPlayerService } from '@/features/media/services/MediaPlayerService';
import { TrackBuilder } from '@/features/media/services/TrackBuilder';
import { ChapterMediaResolver } from '@/features/media/services/ChapterMediaResolver';
import { getQueueStore } from '@/features/media/store/QueueStore';
import { getPlaybackStore } from '@/features/media/store/PlaybackStore';
import { queueOrchestrator } from '@/features/media/services/QueueOrchestrator';
import type {
  PlaylistWithItems,
  PlaylistItem,
  PlaylistItemQueueRef,
} from '../types';
import type { BibleTrack, ChapterMediaOptions } from '@/features/media/types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Service for integrating playlists with the media player queue system
 */
export class PlaylistQueueService {
  private static instance: PlaylistQueueService;
  private trackBuilder: TrackBuilder;
  private chapterMediaResolver: ChapterMediaResolver;

  private constructor() {
    this.trackBuilder = new TrackBuilder();
    this.chapterMediaResolver = new ChapterMediaResolver();
  }

  static getInstance(): PlaylistQueueService {
    if (!PlaylistQueueService.instance) {
      PlaylistQueueService.instance = new PlaylistQueueService();
    }
    return PlaylistQueueService.instance;
  }

  /**
   * Play a playlist by building tracks for all chapters and starting playback
   */
  async playPlaylist(playlist: PlaylistWithItems): Promise<void> {
    logger.info(ENABLE_LOGGING, '[PlaylistQueueService] Playing playlist:', {
      playlistId: playlist.id,
      itemCount: playlist.items.length,
    });

    if (playlist.items.length === 0) {
      throw new Error('Playlist is empty');
    }

    try {
      // Build tracks for all playlist items
      const tracks: BibleTrack[] = [];

      for (const item of playlist.items) {
        try {
          const track = await this.buildTrackForPlaylistItem(item);
          if (track) {
            tracks.push(track);
          }
        } catch (error) {
          logger.warn(
            ENABLE_LOGGING,
            '[PlaylistQueueService] Failed to build track for item:',
            {
              itemId: item.id,
              chapterId: this.extractChapterIdFromVerseId(item.start_verse_id),
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );
          // Continue with other tracks even if one fails
        }
      }

      if (tracks.length === 0) {
        throw new Error('No valid tracks could be built for this playlist');
      }

      // Start playing the first track
      // The existing queue system will handle the rest
      if (tracks.length > 0 && tracks[0]) {
        await mediaPlayerService.playChapter(tracks[0].chapterId);

        logger.info(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Playlist playback started:',
          {
            playlistId: playlist.id,
            tracksBuilt: tracks.length,
            firstTrackId: tracks[0].id,
          }
        );
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistQueueService] Error playing playlist:',
        error
      );
      throw error;
    }
  }

  /**
   * Build a track for a playlist item
   */
  private async buildTrackForPlaylistItem(
    item: PlaylistItem
  ): Promise<BibleTrack | null> {
    try {
      // Extract chapter ID from verse ID
      const chapterId = this.extractChapterIdFromVerseId(item.start_verse_id);
      if (!chapterId) {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Could not extract chapter ID from verse ID:',
          item.start_verse_id
        );
        return null;
      }

      // Resolve chapter media (will use user's current audio version preference)
      const chapterMedia =
        await this.chapterMediaResolver.resolveChapterMedia(chapterId);

      if (!chapterMedia) {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] No media found for chapter:',
          chapterId
        );
        return null;
      }

      // Build track (will use user's current audio version preference)
      const track = await this.trackBuilder.buildChapterTrack(chapterId);

      return track || null;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[PlaylistQueueService] Error building track for item:',
        {
          itemId: item.id,
          chapterId: this.extractChapterIdFromVerseId(item.start_verse_id),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      return null;
    }
  }

  /**
   * Get estimated duration for a playlist
   */
  async getPlaylistDuration(playlist: PlaylistWithItems): Promise<number> {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistQueueService] Calculating playlist duration:',
      playlist.id
    );

    let totalDuration = 0;

    for (const item of playlist.items) {
      try {
        const chapterId = this.extractChapterIdFromVerseId(item.start_verse_id);
        if (!chapterId) continue;

        const chapterMedia =
          await this.chapterMediaResolver.resolveChapterMedia(chapterId);

        if (chapterMedia) {
          totalDuration += chapterMedia.totalDuration;
        }
      } catch {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Error getting duration for item:',
          {
            itemId: item.id,
            chapterId: this.extractChapterIdFromVerseId(item.start_verse_id),
          }
        );
      }
    }

    logger.info(
      ENABLE_LOGGING,
      '[PlaylistQueueService] Playlist duration calculated:',
      {
        playlistId: playlist.id,
        totalDuration,
        itemCount: playlist.items.length,
      }
    );

    return totalDuration;
  }

  /**
   * Validate that all playlist items have available media
   */
  async validatePlaylist(playlist: PlaylistWithItems): Promise<{
    isValid: boolean;
    availableItems: PlaylistItem[];
    unavailableItems: PlaylistItem[];
  }> {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistQueueService] Validating playlist:',
      playlist.id
    );

    const availableItems: PlaylistItem[] = [];
    const unavailableItems: PlaylistItem[] = [];

    for (const item of playlist.items) {
      try {
        const chapterId = this.extractChapterIdFromVerseId(item.start_verse_id);
        if (!chapterId) {
          unavailableItems.push(item);
          continue;
        }

        const chapterMedia =
          await this.chapterMediaResolver.resolveChapterMedia(chapterId);

        if (chapterMedia && chapterMedia.hasStreamingAvailable) {
          availableItems.push(item);
        } else {
          unavailableItems.push(item);
        }
      } catch {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Error validating item:',
          {
            itemId: item.id,
            chapterId: this.extractChapterIdFromVerseId(item.start_verse_id),
          }
        );
        unavailableItems.push(item);
      }
    }

    const isValid = availableItems.length > 0;

    logger.info(
      ENABLE_LOGGING,
      '[PlaylistQueueService] Playlist validation complete:',
      {
        playlistId: playlist.id,
        isValid,
        availableCount: availableItems.length,
        unavailableCount: unavailableItems.length,
      }
    );

    return {
      isValid,
      availableItems,
      unavailableItems,
    };
  }

  /**
   * Get playlist items with their media status
   */
  async getPlaylistItemsWithStatus(playlist: PlaylistWithItems): Promise<
    Array<{
      item: PlaylistItem;
      hasMedia: boolean;
      duration?: number;
      isDownloaded?: boolean;
    }>
  > {
    logger.info(
      ENABLE_LOGGING,
      '[PlaylistQueueService] Getting playlist items with status:',
      playlist.id
    );

    const itemsWithStatus = [];

    for (const item of playlist.items) {
      try {
        const chapterId = this.extractChapterIdFromVerseId(item.start_verse_id);
        if (!chapterId) {
          itemsWithStatus.push({
            item,
            hasMedia: false,
          });
          continue;
        }

        const chapterMedia =
          await this.chapterMediaResolver.resolveChapterMedia(chapterId);

        itemsWithStatus.push({
          item,
          hasMedia: !!chapterMedia,
          duration: chapterMedia?.totalDuration,
          isDownloaded: chapterMedia?.hasDownloadedFiles,
        });
      } catch {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Error getting status for item:',
          {
            itemId: item.id,
            chapterId: this.extractChapterIdFromVerseId(item.start_verse_id),
          }
        );
        itemsWithStatus.push({
          item,
          hasMedia: false,
        });
      }
    }

    return itemsWithStatus;
  }

  /**
   * Play a playlist item (verse range)
   */
  async playPlaylistItem(
    playlistItem: PlaylistItem,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] 🎵 Playing playlist item: ${playlistItem.start_verse_id} - ${playlistItem.end_verse_id}`
      );

      // Validate required fields
      if (!playlistItem.start_verse_id || !playlistItem.end_verse_id) {
        throw new Error(
          `Missing verse IDs: start=${playlistItem.start_verse_id}, end=${playlistItem.end_verse_id}`
        );
      }

      // Extract chapter ID from verse ID (e.g., "gen-1-1" -> "gen-1")
      const chapterId = this.extractChapterIdFromVerseId(
        playlistItem.start_verse_id
      );

      if (!chapterId) {
        throw new Error(
          `Invalid or missing verse ID: ${playlistItem.start_verse_id}`
        );
      }

      // Use the optimized approach with verse range
      await this.playPlaylistItemOptimized(playlistItem, options, chapterId);
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ❌ Error playing playlist item:`,
        error
      );
      throw error;
    }
  }

  /**
   * Optimized playPlaylistItem using sliding window queue
   */
  async playPlaylistItemOptimized(
    playlistItem: PlaylistItem,
    _options: ChapterMediaOptions = {},
    chapterId?: string
  ): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] 🚀 Playing playlist item (optimized): ${playlistItem.start_verse_id} - ${playlistItem.end_verse_id}`
      );

      // Validate required fields
      if (!playlistItem.start_verse_id || !playlistItem.end_verse_id) {
        throw new Error(
          `Missing verse IDs: start=${playlistItem.start_verse_id}, end=${playlistItem.end_verse_id}`
        );
      }

      const resolvedChapterId =
        chapterId ||
        this.extractChapterIdFromVerseId(playlistItem.start_verse_id);
      if (!resolvedChapterId) {
        throw new Error(
          `Invalid or missing verse ID: ${playlistItem.start_verse_id}`
        );
      }

      // Check if we can play immediately from current queue
      if (this.canPlayPlaylistItemImmediately(playlistItem)) {
        logger.info(
          ENABLE_LOGGING,
          '[PlaylistQueueService] ⚡ Playing playlist item from existing queue (instant)'
        );
        await this.playPlaylistItemFromExistingQueue(playlistItem);
        return;
      }

      // Build verse range track
      const track = await this.trackBuilder.buildVerseRangeTrack(
        resolvedChapterId,
        playlistItem.start_verse_id,
        playlistItem.end_verse_id,
        _options
      );

      if (!track) {
        throw new Error(
          `Failed to build track for playlist item: ${playlistItem.id}`
        );
      }

      // Set as single track and play
      await TrackPlayer.setQueue([track]);

      // If this is a verse range track, seek to the start of the range
      if (track.isVerseRange && track.verseRangeStartTime !== undefined) {
        await TrackPlayer.seekTo(track.verseRangeStartTime);
        logger.info(
          ENABLE_LOGGING,
          `[PlaylistQueueService] 🎯 Seeking to verse range start: ${track.verseRangeStartTime}s`
        );
      }

      await TrackPlayer.play();

      // Update stores
      const queueStore = getQueueStore();
      const playbackStore = getPlaybackStore();
      playbackStore.setCurrentTrack(track);
      queueStore.updateQueue({
        audioQueue: [track],
        windowStartIndex: 0,
        currentIndex: 0,
      });

      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ✅ Playlist item playing (optimized)`
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ❌ Error playing playlist item (optimized):`,
        error
      );
      throw error;
    }
  }

  /**
   * Add playlist item to queue (Spotify-style "Add to Queue")
   */
  async addPlaylistItemToQueue(
    playlistItem: PlaylistItem,
    options: ChapterMediaOptions = {}
  ): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ➕ Adding playlist item to queue: ${playlistItem.start_verse_id} - ${playlistItem.end_verse_id}`
      );

      // Validate required fields
      if (!playlistItem.start_verse_id || !playlistItem.end_verse_id) {
        throw new Error(
          `Missing verse IDs: start=${playlistItem.start_verse_id}, end=${playlistItem.end_verse_id}`
        );
      }

      // Extract chapter ID from verse ID
      const chapterId = this.extractChapterIdFromVerseId(
        playlistItem.start_verse_id
      );
      if (!chapterId) {
        throw new Error(
          `Invalid or missing verse ID: ${playlistItem.start_verse_id}`
        );
      }

      const ref: PlaylistItemQueueRef = {
        playlistItemId: playlistItem.id,
        startVerseId: playlistItem.start_verse_id,
        endVerseId: playlistItem.end_verse_id,
        chapterId: chapterId,
        ...(options.textVersionId
          ? { textVersionId: options.textVersionId }
          : {}),
      };

      // Add to store as a special playlist item reference
      getQueueStore().addPlaylistItemRef(ref);

      await queueOrchestrator.ensureWindow();

      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ✅ Successfully added playlist item to queue`
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `[PlaylistQueueService] ❌ Error adding playlist item to queue:`,
        error
      );
      throw error;
    }
  }

  /**
   * Play playlist item from existing queue
   */
  private async playPlaylistItemFromExistingQueue(
    playlistItem: PlaylistItem
  ): Promise<void> {
    const trackId = this.generatePlaylistItemTrackId(playlistItem);
    const queue = await TrackPlayer.getQueue();
    const trackIndex = queue.findIndex(track => track['id'] === trackId);

    if (trackIndex === -1) {
      throw new Error(`Playlist item track ${trackId} not found in queue`);
    }

    if (trackIndex >= queue.length) {
      throw new Error(
        `Track index ${trackIndex} is out of bounds (queue length: ${queue.length})`
      );
    }

    // Skip to track
    await TrackPlayer.skip(trackIndex);

    // If this is a verse range track, seek to the start of the range
    const track = queue[trackIndex] as BibleTrack;
    if (track.isVerseRange && track.verseRangeStartTime !== undefined) {
      await TrackPlayer.seekTo(track.verseRangeStartTime);
      logger.info(
        ENABLE_LOGGING,
        `[PlaylistQueueService] 🎯 Seeking to verse range start from queue: ${track.verseRangeStartTime}s`
      );
    }

    await TrackPlayer.play();
  }

  /**
   * Check if playlist item can be played immediately
   */
  private canPlayPlaylistItemImmediately(playlistItem: PlaylistItem): boolean {
    const trackId = this.generatePlaylistItemTrackId(playlistItem);
    const store = getQueueStore();
    return store.audioQueue.some(track => track.id === trackId);
  }

  /**
   * Generate track ID for playlist item
   */
  private generatePlaylistItemTrackId(playlistItem: PlaylistItem): string {
    return `playlist_item_${playlistItem.id}_${playlistItem.start_verse_id}_${playlistItem.end_verse_id}`;
  }

  /**
   * Extract chapter ID from verse ID (e.g., "gen-1-1" -> "gen-1")
   */
  private extractChapterIdFromVerseId(verseId: string | null): string | null {
    if (!verseId || typeof verseId !== 'string') {
      return null;
    }

    const parts = verseId.split('-');
    if (parts.length >= 3 && parts[0] && parts[1]) {
      return `${parts[0]}-${parts[1]}`;
    }
    return null;
  }

  /**
   * Get playlist item queue tracks
   */
  getPlaylistItemQueue(): PlaylistItemQueueRef[] {
    return [...getQueueStore().playlistItemQueue];
  }

  /**
   * Remove playlist item from queue
   */
  removePlaylistItemFromQueue(playlistItemId: string): void {
    const store = getQueueStore();
    const initialLength = store.playlistItemQueue.length;

    store.removePlaylistItemFromQueue(playlistItemId);

    if (store.playlistItemQueue.length < initialLength) {
      // Rebuild current window without the removed track
      queueOrchestrator.ensureWindow().catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Failed to rebuild window after playlist item removal:',
          error
        );
      });
    }
  }

  /**
   * Clear all playlist item queue tracks
   */
  clearPlaylistItemQueue(): void {
    const store = getQueueStore();
    if (store.playlistItemQueue.length > 0) {
      store.clearPlaylistItemQueue();

      queueOrchestrator.ensureWindow().catch(error => {
        logger.warn(
          ENABLE_LOGGING,
          '[PlaylistQueueService] Failed to rebuild window after clearing playlist item queue:',
          error
        );
      });
    }
  }
}

// Export singleton instance
export const playlistQueueService = PlaylistQueueService.getInstance();

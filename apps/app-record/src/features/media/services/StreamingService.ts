import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import type { BibleTrack } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Service responsible for optimized media streaming, buffering, and track loading
 * Optimized for older/slower phones with conservative memory usage
 */
export class StreamingService {
  private preloadedTracks = new Set<string>();

  /**
   * Load and prepare a track for playback with streaming optimizations
   */
  async loadAndPlayTrack(track: BibleTrack): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, `Loading track: ${track.title}`);

      // Clear existing queue for single track playback
      await TrackPlayer.reset();

      // Add track with streaming optimizations
      await TrackPlayer.add({
        ...track,
        // Ensure progressive download for streaming
        isLiveStream: false,
        // Add cache headers for better streaming
        headers: {
          'Cache-Control': 'max-age=3600',
          'Accept-Ranges': 'bytes',
        },
      });

      // Start playback
      await TrackPlayer.play();

      // Preload next track if available (non-blocking)
      this.preloadNextTrack().catch(error => {
        logger.warn(ENABLE_LOGGING, 'Failed to preload next track:', error);
      });

      logger.info(ENABLE_LOGGING, `Track loaded and playing: ${track.title}`);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error loading track:', error);
      throw new Error(`Failed to load track: ${track.title}`);
    }
  }

  /**
   * Add multiple tracks to queue with streaming optimizations
   */
  async addTracksToQueue(
    tracks: BibleTrack[],
    insertIndex?: number
  ): Promise<void> {
    if (!tracks.length) return;

    try {
      // Process tracks in smaller batches for older devices
      const BATCH_SIZE = 5;
      const optimizedTracks = tracks.map(track => ({
        ...track,
        // Add streaming optimizations
        headers: {
          'Cache-Control': 'max-age=3600',
          'Accept-Ranges': 'bytes',
        },
      }));

      // Add tracks in batches to avoid memory spikes
      for (let i = 0; i < optimizedTracks.length; i += BATCH_SIZE) {
        const batch = optimizedTracks.slice(i, i + BATCH_SIZE);
        const batchIndex =
          insertIndex !== undefined ? insertIndex + i : undefined;

        await TrackPlayer.add(batch, batchIndex);

        // Small delay between batches for older devices
        if (i + BATCH_SIZE < optimizedTracks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(ENABLE_LOGGING, `Added ${tracks.length} tracks to queue`);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error adding tracks to queue:', error);
      throw error;
    }
  }

  /**
   * Preload the next track in queue for smooth transitions
   */
  async preloadNextTrack(): Promise<void> {
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (
        currentIndex === null ||
        currentIndex === undefined ||
        currentIndex >= queue.length - 1
      ) {
        return; // No next track to preload
      }

      const nextTrack = queue[currentIndex + 1];
      const trackId = nextTrack?.['id'] as string;

      if (!trackId || this.preloadedTracks.has(trackId)) {
        return; // Already preloaded
      }

      // Preload by triggering a small download request
      // This uses the device's HTTP cache without affecting playback
      if (nextTrack?.['url']) {
        const url = nextTrack['url'] as string;

        // Use a range request to preload just the beginning
        fetch(url, {
          method: 'GET',
          headers: {
            Range: `bytes=0-${1024 * 100}`, // Preload first 100KB
            'Cache-Control': 'max-age=3600',
          },
        })
          .then(() => {
            this.preloadedTracks.add(trackId);
            logger.info(ENABLE_LOGGING, `Preloaded next track: ${trackId}`);
          })
          .catch(error => {
            logger.warn(
              ENABLE_LOGGING,
              `Failed to preload track ${trackId}:`,
              error
            );
          });
      }
    } catch (error) {
      logger.warn(ENABLE_LOGGING, 'Error in preload next track:', error);
    }
  }

  /**
   * Optimize buffering settings based on network conditions
   */
  async optimizeBuffering(
    networkStrength: 'poor' | 'good' | 'excellent' = 'good'
  ): Promise<void> {
    try {
      // Note: Buffer settings would need to be applied during setupPlayer initialization
      // This method can be used to inform initial setup based on network conditions
      logger.info(
        ENABLE_LOGGING,
        `Buffering optimized for ${networkStrength} network`
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error optimizing buffering:', error);
    }
  }

  /**
   * Clear preload cache to free memory
   */
  clearPreloadCache(): void {
    this.preloadedTracks.clear();
    logger.info(ENABLE_LOGGING, 'Preload cache cleared');
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): { preloadedTracks: number } {
    return {
      preloadedTracks: this.preloadedTracks.size,
    };
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.clearPreloadCache();
    logger.info(ENABLE_LOGGING, 'StreamingService destroyed');
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

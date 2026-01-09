import TrackPlayer from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';
import type { BibleTrack } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Get current track from TrackPlayer with error handling
 */
export const getCurrentTrackFromPlayer =
  async (): Promise<BibleTrack | null> => {
    try {
      const track = await TrackPlayer.getCurrentTrack();
      return track as BibleTrack | null;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'Failed to get current track from TrackPlayer:',
        error
      );
      return null;
    }
  };

/**
 * Sync current track between TrackPlayer and store
 */
export const syncCurrentTrack = async (
  setCurrentTrack: (track: BibleTrack | null) => void,
  currentStoreTrack: BibleTrack | null
): Promise<boolean> => {
  try {
    const playerTrack = await getCurrentTrackFromPlayer();

    // Only update if there's a mismatch
    if (playerTrack?.id !== currentStoreTrack?.id) {
      setCurrentTrack(playerTrack);
      logger.debug(
        ENABLE_LOGGING,
        'Track sync updated current track:',
        playerTrack?.title || 'none'
      );
      return true;
    }

    return false;
  } catch (error) {
    logger.warn(ENABLE_LOGGING, 'Track sync failed:', error);
    return false;
  }
};

/**
 * Load initial current track on app startup
 */
export const loadInitialCurrentTrack = async (
  setCurrentTrack: (track: BibleTrack | null) => void
): Promise<void> => {
  try {
    const currentTrack = await getCurrentTrackFromPlayer();
    if (currentTrack) {
      setCurrentTrack(currentTrack);
      logger.info(
        ENABLE_LOGGING,
        'Loaded initial current track:',
        currentTrack.title
      );
    } else {
      logger.info(ENABLE_LOGGING, 'No initial track found');
    }
  } catch (error) {
    logger.warn(ENABLE_LOGGING, 'Failed to load initial current track:', error);
  }
};

import TrackPlayer, {
  Event,
  State,
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Use proper type for timeout
type TimeoutHandle = ReturnType<typeof setTimeout>;

// Simple audio health monitoring
let audioHealthCheckInterval: TimeoutHandle | null = null;
let lastKnownPosition = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

// Simple error logging
const logAudioError = (context: string, error: unknown) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? error.message : String(error),
    consecutiveErrors: ++consecutiveErrors,
  };

  logger.error(ENABLE_LOGGING, '🚨 Audio Error:', errorInfo);

  if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS) {
    logger.error(
      ENABLE_LOGGING,
      '🚨 Too many consecutive errors, audio may be in bad state'
    );
  }
};

// Simple audio health check
const startAudioHealthMonitoring = () => {
  if (audioHealthCheckInterval) {
    clearInterval(audioHealthCheckInterval);
  }

  audioHealthCheckInterval = setInterval(async () => {
    try {
      const state = await TrackPlayer.getState();
      const currentTrack = await TrackPlayer.getCurrentTrack();

      if (state === State.Playing && currentTrack !== null) {
        const currentPosition = await TrackPlayer.getPosition();
        const isAdvancing = currentPosition > lastKnownPosition;

        if (!isAdvancing) {
          logger.warn(
            ENABLE_LOGGING,
            '⚠️ Audio not advancing, attempting recovery...'
          );
          await TrackPlayer.play();
        }

        lastKnownPosition = currentPosition;
      }

      consecutiveErrors = 0;
    } catch (error) {
      logAudioError('audio health check', error);
    }
  }, 5000); // Check every 5 seconds
};

/**
 * React Native Track Player background service
 * This service handles playback events that need to run in the background,
 * such as remote control events from notification center, lock screen, etc.
 */
export const PlaybackService = async function () {
  logger.info(ENABLE_LOGGING, 'Initializing PlaybackService...');

  // Configure TrackPlayer for background playback
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
  });

  // Start audio health monitoring
  startAudioHealthMonitoring();

  // Handle remote play button with error handling
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      logger.info(ENABLE_LOGGING, 'Remote play requested');
      await TrackPlayer.play();
      consecutiveErrors = 0;
    } catch (error) {
      logAudioError('Remote Play', error);
    }
  });

  // Handle remote pause button with error handling
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      logger.info(ENABLE_LOGGING, 'Remote pause requested');
      await TrackPlayer.pause();
      consecutiveErrors = 0;
    } catch (error) {
      logAudioError('Remote Pause', error);
    }
  });

  // Handle remote stop button with error handling
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      logger.info(ENABLE_LOGGING, 'Remote stop requested');
      await TrackPlayer.stop();
      consecutiveErrors = 0;
    } catch (error) {
      logAudioError('Remote Stop', error);
    }
  });

  // Handle remote next track button
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    logger.info(ENABLE_LOGGING, 'Remote next requested');
    const { getHistoryStore } = await import('../store/HistoryStore');
    getHistoryStore().setForwardTransition();
    logger.debug(
      ENABLE_LOGGING,
      '[UI] transition set to forward (remote next)'
    );
    const { mediaPlayerService } = await import('./MediaPlayerService');
    await mediaPlayerService.skipToNext();
  });

  // Handle remote previous track button
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    logger.info(ENABLE_LOGGING, 'Remote previous requested');
    const { getPlaybackStore } = await import('../store/PlaybackStore');
    const position = getPlaybackStore().position || 0;
    const { getHistoryStore } = await import('../store/HistoryStore');
    getHistoryStore().setBackwardTransition();
    logger.debug(
      ENABLE_LOGGING,
      '[UI] transition set to backward (remote previous)'
    );
    const { mediaPlayerService } = await import('./MediaPlayerService');
    await mediaPlayerService.skipToPrevious(position);
  });

  // Handle remote seek (scrubbing on lock screen) with error handling
  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    try {
      logger.info(ENABLE_LOGGING, `Remote seek to ${position}s requested`);
      await TrackPlayer.seekTo(position);
      consecutiveErrors = 0;
    } catch (error) {
      logAudioError('Remote Seek', error);
    }
  });

  // PlaybackQueueEnded handled in foreground service to avoid double processing

  // Handle playback errors
  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    logger.error(ENABLE_LOGGING, `Playback error: ${code} - ${message}`);
  });

  logger.info(ENABLE_LOGGING, 'PlaybackService initialized successfully');
};

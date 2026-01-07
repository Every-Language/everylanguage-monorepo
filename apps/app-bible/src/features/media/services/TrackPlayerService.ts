import TrackPlayer, {
  AndroidAudioContentType,
  IOSCategory,
  IOSCategoryMode,
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export class TrackPlayerService {
  private static isInitialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize TrackPlayer with optimal settings for Bible audio playback
   * Optimized for older/slower phones with conservative buffer settings
   */
  static async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (TrackPlayerService.isInitialized) {
      logger.info(
        ENABLE_LOGGING,
        'TrackPlayer already initialized, skipping...'
      );
      return;
    }

    // If initialization is in progress, wait for it
    if (TrackPlayerService.initializationPromise) {
      logger.info(
        ENABLE_LOGGING,
        'TrackPlayer initialization in progress, waiting...'
      );
      return TrackPlayerService.initializationPromise;
    }

    // Start initialization and store the promise
    TrackPlayerService.initializationPromise =
      TrackPlayerService.doInitialize();

    try {
      await TrackPlayerService.initializationPromise;
      TrackPlayerService.isInitialized = true;
      logger.info(ENABLE_LOGGING, 'TrackPlayer initialized successfully');
    } catch (error) {
      TrackPlayerService.initializationPromise = null; // Reset on failure
      logger.error(ENABLE_LOGGING, 'Failed to initialize TrackPlayer:', error);
      throw error;
    }
  }

  /**
   * Internal initialization method that performs the actual setup
   */
  private static async doInitialize(): Promise<void> {
    logger.info(ENABLE_LOGGING, 'Initializing TrackPlayer...');

    try {
      await TrackPlayer.setupPlayer({
        // Audio buffering - optimized for older/slower phones
        minBuffer: 15, // 15 seconds minimum buffer
        maxBuffer: 60, // 60 seconds maximum buffer to avoid memory issues
        playBuffer: 2.5, // 2.5 seconds to start playing
        backBuffer: 10, // Keep 10 seconds behind current position

        // Cache settings - conservative for older phones
        maxCacheSize: 50 * 1024, // 50MB max cache (in KB)

        // Android audio settings
        androidAudioContentType: AndroidAudioContentType.Speech, // Optimize for speech

        // iOS audio settings
        iosCategory: IOSCategory.Playback,
        iosCategoryMode: IOSCategoryMode.SpokenAudio, // Optimize for spoken word
        iosCategoryOptions: [],

        // Interruption handling
        autoHandleInterruptions: true,

        // Metadata handling
        autoUpdateMetadata: true,
      });
    } catch (error: unknown) {
      // Handle the specific "already initialized" error gracefully
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'player_already_initialized'
      ) {
        logger.info(
          ENABLE_LOGGING,
          'TrackPlayer already initialized, continuing with options setup...'
        );
      } else {
        throw error;
      }
    }

    // Set up remote control capabilities
    await TrackPlayer.updateOptions({
      // Configure media controls in notification/lock screen
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],

      // Compact controls (Android notification)
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],

      // Progressive download for streaming
      progressUpdateEventInterval: 1, // Update progress every second

      // For Android background playback behavior
      android: {
        // Continue playback when app is killed (default behavior)
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    });
  }

  /**
   * Reset the initialization state (for testing/development)
   */
  static async reset(): Promise<void> {
    try {
      await TrackPlayer.reset();
      // Note: TrackPlayer doesn't have a destroy method, just reset
    } catch (error) {
      // Ignore errors during reset - player might not be initialized
      logger.debug(ENABLE_LOGGING, 'TrackPlayer reset error (ignored):', error);
    }
    TrackPlayerService.isInitialized = false;
    TrackPlayerService.initializationPromise = null;
    logger.info(ENABLE_LOGGING, 'TrackPlayer reset completed');
  }

  /**
   * Check if TrackPlayer is initialized
   */
  static get initialized(): boolean {
    return TrackPlayerService.isInitialized;
  }
}

// Export default instance
export const trackPlayerService = TrackPlayerService;

import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

// Enable react-native-screens for better performance
enableScreens();

import App from './src/app/App';
import { logger } from './src/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Register the app first
registerRootComponent(App);

// Register TrackPlayer service after app registration to ensure proper initialization order
// Use a more robust approach to prevent early module access
const registerTrackPlayerService = async () => {
  try {
    const TrackPlayer = (await import('react-native-track-player')).default;
    const { PlaybackService } = await import('./src/features/media/services');

    TrackPlayer.registerPlaybackService(() => PlaybackService);
    logger.info(ENABLE_LOGGING, 'TrackPlayer service registered successfully');
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      'Failed to register TrackPlayer service:',
      error
    );
  }
};

// Use a longer delay to ensure the app context is fully ready before registering the service
setTimeout(registerTrackPlayerService, 2000);

import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

// Enable react-native-screens for better performance
// This must be called before any screens are created
enableScreens();

// Logging configuration for this module
import { logger } from '@/shared/utils/logger';
const ENABLE_LOGGING = false;

// Create a wrapper component that lazy-loads App to delay store initialization
// This ensures the React Native bridge is ready before stores try to access AsyncStorage
const AppWrapper: React.FC = () => {
  const [AppComponent, setAppComponent] =
    React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    import('./src/app/App')
      .then(module => {
        setAppComponent(() => module.default);
      })
      .catch(error => {
        console.error('[index.ts] Failed to import App component:', error);
      });
  }, []);

  if (!AppComponent) {
    // Show loading screen while App loads
    return React.createElement(
      View,
      {
        style: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000',
        },
      },
      React.createElement(ActivityIndicator, { size: 'large', color: '#fff' })
    );
  }

  return React.createElement(AppComponent);
};

// Register the root component
registerRootComponent(AppWrapper);

// Register TrackPlayer service after app registration to ensure proper initialization order
// Use a more robust approach to prevent early module access
const registerTrackPlayerService = async () => {
  try {
    const TrackPlayer = (await import('react-native-track-player')).default;
    const { PlaybackService } = await import('./src/features/media/services');
    const { logger } = await import('./src/shared/utils/logger');

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

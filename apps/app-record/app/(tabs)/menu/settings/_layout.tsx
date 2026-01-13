import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Settings Stack Layout
 *
 * Nested Stack navigator for settings section.
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
const SettingsStackLayout: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === 'ios',
        animationMatchesGesture: true,
        contentStyle: {
          backgroundColor: theme?.colors?.background || '#ebe5d9',
        },
      }}
    />
  );
};

export default SettingsStackLayout;

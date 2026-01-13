import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Project Detail Stack Layout
 *
 * Nested Stack navigator for project detail section (sequences, create sequence).
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
export const unstable_settings = {
  anchor: 'sequences',
};

const ProjectDetailStackLayout: React.FC = () => {
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
      }}>
      <Stack.Screen
        name='sequences'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='create-sequence'
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
};

export default ProjectDetailStackLayout;

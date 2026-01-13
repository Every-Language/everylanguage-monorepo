import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Projects Stack Layout
 *
 * Nested Stack navigator for projects section.
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
const ProjectsStackLayout: React.FC = () => {
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
        name='index'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='create'
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name='[projectId]'
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default ProjectsStackLayout;

import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Edit Project Modal Stack Layout
 *
 * Nested Stack navigator for edit project modal flow.
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

const EditProjectStackLayout: React.FC = () => {
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
        name='source-language'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='target-language'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='region'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='language-info'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='region-info'
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default EditProjectStackLayout;

import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Create Sequence Modal Stack Layout
 *
 * Nested Stack navigator for create sequence modal flow.
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

const CreateSequenceStackLayout: React.FC = () => {
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
        name='select-book'
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name='select-chapter'
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default CreateSequenceStackLayout;

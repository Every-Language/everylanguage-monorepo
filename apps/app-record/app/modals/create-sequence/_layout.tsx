import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Create Sequence Modal Stack Layout
 *
 * Root-level modal stack navigator for create sequence flow.
 * Renders above tab bar on both iOS and Android.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

const CreateSequenceModalLayout: React.FC = () => {
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

export default CreateSequenceModalLayout;

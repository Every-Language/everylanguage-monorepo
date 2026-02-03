import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/shared/hooks';

/**
 * Create Project Modal Stack Layout
 *
 * Root-level modal stack navigator for create project flow.
 * Renders above tab bar on both iOS and Android.
 */
export const unstable_settings = {
  initialRouteName: 'index',
};

const CreateProjectModalLayout: React.FC = () => {
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
        name='select-region'
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

export default CreateProjectModalLayout;

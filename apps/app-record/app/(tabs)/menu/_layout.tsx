import React from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/shared/constants/colors';

/**
 * Menu Stack Layout
 *
 * Nested Stack navigator for menu section.
 * Provides native iOS/Android navigation with proper animations and gestures.
 */
const MenuStackLayout: React.FC = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'default',
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === 'ios',
        animationMatchesGesture: true,
        contentStyle: {
          backgroundColor: colors.white,
        },
      }}
    />
  );
};

export default MenuStackLayout;

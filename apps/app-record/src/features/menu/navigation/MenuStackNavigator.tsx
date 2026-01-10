import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { MenuScreen } from '@/features/menu/screens/MenuScreen';
import { ProfileScreen } from '@/features/menu/screens/ProfileScreen';
import { SettingsScreen } from '@/features/menu/screens/SettingsScreen';
import { PlaylistsStackNavigator } from '@/features/playlists/navigation';
import type { PlaylistsStackParamList } from '@/features/playlists/navigation';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { i18n } from '@/shared/services';

// Type definitions for the menu stack
export type MenuStackParamList = {
  Menu: undefined;
  Profile: undefined;
  Settings: undefined;
  Playlists: NavigatorScreenParams<PlaylistsStackParamList>;
};

// Navigation props types
export type MenuStackNavigationProp =
  NativeStackNavigationProp<MenuStackParamList>;

export type MenuScreenProps = NativeStackScreenProps<
  MenuStackParamList,
  'Menu'
>;
export type ProfileScreenProps = NativeStackScreenProps<
  MenuStackParamList,
  'Profile'
>;
export type SettingsScreenProps = NativeStackScreenProps<
  MenuStackParamList,
  'Settings'
>;
export type PlaylistsScreenProps = NativeStackScreenProps<
  MenuStackParamList,
  'Playlists'
>;

const MenuStack = createNativeStackNavigator<MenuStackParamList>();

export const MenuStackNavigator: React.FC = () => {
  return (
    <MenuStack.Navigator
      initialRouteName='Menu'
      screenOptions={{
        headerShown: false, // Hide React Navigation headers - use custom headers
        // animation: 'slide_from_right', // iOS-style slide animation
        gestureEnabled: true, // Enable swipe-back gesture
        fullScreenGestureEnabled: true, // Enable full-screen swipe gesture on iOS
        animationMatchesGesture: true, // Make animations match gesture interactions
      }}>
      <MenuStack.Screen
        name='Menu'
        component={MenuScreen}
        options={{
          title: i18n.t('nav.menu'),
        }}
      />
      <MenuStack.Screen
        name='Profile'
        component={ProfileScreen}
        options={{
          title: i18n.t('profile.myProfile'),
        }}
      />
      <MenuStack.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          title: i18n.t('settings.title'),
        }}
      />
      <MenuStack.Screen
        name='Playlists'
        component={PlaylistsStackNavigator}
        options={{
          title: 'Playlists',
        }}
      />
    </MenuStack.Navigator>
  );
};

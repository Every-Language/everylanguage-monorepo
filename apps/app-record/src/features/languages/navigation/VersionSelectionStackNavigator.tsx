import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { i18n } from '@/shared/services';
import type { AudioVersion, TextVersion } from '../types/entities';
import type { LanguageSearchResult } from '@/features/languages/services/fuzzySearchService';
import { VersionsScreen } from '@/features/languages/screens/VersionSelectionScreen';
import { LanguageSearchScreen } from '@/features/languages/screens/LanguageSearchScreen';
import { VersionInfoScreen } from '@/features/languages/screens/VersionInfoScreen';
import { LanguageInfoScreen } from '../screens/LanguageInfoScreen';

// Type definitions for the version selection stack
export type VersionSelectionStackParamList = {
  Versions: {
    versionType: 'audio' | 'text';
    title?: string;
  };
  LanguageSearch: {
    versionType: 'audio' | 'text';
    title?: string;
  };
  LanguageInfo: {
    versionType: 'audio' | 'text';
    languageResult: LanguageSearchResult;
    title?: string;
  };
  VersionInfo: {
    versionType: 'audio' | 'text';
    version: AudioVersion | TextVersion;
  };
};

// Navigation props types
export type VersionSelectionStackNavigationProp =
  NativeStackNavigationProp<VersionSelectionStackParamList>;

export type VersionsScreenProps = NativeStackScreenProps<
  VersionSelectionStackParamList,
  'Versions'
>;

export type LanguageSearchScreenProps = NativeStackScreenProps<
  VersionSelectionStackParamList,
  'LanguageSearch'
>;

export type LanguageInfoScreenProps = NativeStackScreenProps<
  VersionSelectionStackParamList,
  'LanguageInfo'
>;

export type VersionInfoScreenProps = NativeStackScreenProps<
  VersionSelectionStackParamList,
  'VersionInfo'
>;

const VersionSelectionStack =
  createNativeStackNavigator<VersionSelectionStackParamList>();

interface VersionSelectionStackNavigatorProps {
  route: RouteProp<
    {
      VersionSelectionModal: {
        versionType: 'audio' | 'text';
        title?: string;
        initialScreen?: keyof VersionSelectionStackParamList;
      };
    },
    'VersionSelectionModal'
  >;
}

export const VersionSelectionStackNavigator: React.FC<
  VersionSelectionStackNavigatorProps
> = ({ route }) => {
  const { versionType, title, initialScreen } = route.params;
  // i18n imported at module scope

  return (
    <VersionSelectionStack.Navigator
      initialRouteName={initialScreen ?? 'Versions'}
      screenOptions={{
        headerShown: false, // Hide React Navigation headers - use custom headers
        // animation: 'slide_from_right', // iOS-style slide animation
        gestureEnabled: true, // Enable swipe-back gesture
        fullScreenGestureEnabled: true, // Enable full-screen swipe gesture on iOS
        animationMatchesGesture: true, // Make animations match gesture interactions
      }}>
      <VersionSelectionStack.Screen
        name='Versions'
        component={VersionsScreen}
        initialParams={{
          versionType,
          title: title || i18n.t('versions.modalSelect', { versionType }),
        }}
        options={{
          title: title || i18n.t('versions.modalSelect', { versionType }),
        }}
      />
      <VersionSelectionStack.Screen
        name='LanguageSearch'
        component={LanguageSearchScreen}
        initialParams={{
          versionType,
          title: title || i18n.t('languages.search.header', { versionType }),
        }}
        options={{
          title: i18n.t('languages.search.header', { versionType }),
        }}
      />
      <VersionSelectionStack.Screen
        name='LanguageInfo'
        component={LanguageInfoScreen}
        options={{
          title: i18n.t('languages.infoTitle', {
            defaultValue: 'Language info',
          }),
        }}
      />
      <VersionSelectionStack.Screen
        name='VersionInfo'
        component={VersionInfoScreen}
        options={{
          title: i18n.t('versions.infoTitle'),
        }}
      />
    </VersionSelectionStack.Navigator>
  );
};

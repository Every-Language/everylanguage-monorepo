import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NavigatorScreenParams } from '@react-navigation/native';
import { AppShell } from './AppShell';
import { OnboardingStackNavigator } from '@/features/onboarding/navigation/OnboardingStackNavigator';
import { VersionSelectionStackNavigator } from '@/features/languages/navigation/VersionSelectionStackNavigator';
import {
  MenuStackNavigator,
  MenuStackParamList,
} from '@/features/menu/navigation/MenuStackNavigator';
import { AuthStackNavigator } from '@/features/auth/navigation/AuthStackNavigator';
import { DownloadStatusModal } from '@/features/downloads/screens/DownloadStatusModal';
import {
  ExportBiblePackageModal,
  ExportVersionModal,
  ImportBiblePackageModal,
} from '@/features/sharing/screens';
import { CreatePlaylistModal } from '@/features/playlists/components/CreatePlaylistModal';
import { EditPlaylistModal } from '@/features/playlists/components/EditPlaylistModal';
import { AddToPlaylistModal } from '@/features/playlists/components/AddToPlaylistModal';
import { AddCustomTextToPlaylistScreen } from '@/features/playlists/screens/AddCustomTextToPlaylistScreen';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { useTheme } from '@/shared/hooks';
import { i18n } from '@/shared/services';
import { HistoryModal } from '@/features/media/screens/HistoryModal';
import { LocaleSelectionModal } from '@/features/onboarding/screens/LocaleSelectionModal';
import { SearchScreen } from '@/features/search/screens';
import { QuickSelectionNavigator } from '@/features/quick-selection/navigation/QuickSelectionNavigator';
import { EditProfileModal } from '@/features/menu/screens/EditProfileModal';
import { UserVersionSelectionModalWrapper } from '@/features/auth/components/UserVersionSelectionModalWrapper';
import type { PlaylistWithItems } from '@/features/playlists/types';

// Type definitions for the root navigation stack
export type RootStackParamList = {
  Home: undefined;
  Onboarding: undefined;
  VersionSelectionModal: {
    versionType: 'audio' | 'text';
    title?: string;
  };
  MenuModal: NavigatorScreenParams<MenuStackParamList>;
  AuthModal: undefined;
  UserVersionSelectionModal: undefined;
  DownloadStatusModal: undefined;
  HistoryModal: undefined;
  LanguageSelector: undefined;
  ExportBiblePackageModal: undefined;
  ExportVersionModal: {
    versionType: 'audio' | 'text';
    versionId: string;
    versionName: string;
  };
  ImportBiblePackageModal: undefined;
  AddToPlaylistModal: {
    playlist?: PlaylistWithItems;
    chapterId?: string;
    bookId?: string;
    bookName?: string;
    chapterNumber?: number;
    audioVersionId?: string;
  };
  CreatePlaylistModal:
    | {
        // For chapter addition
        chapterId?: string;
        bookName?: string;
        chapterNumber?: number;
        audioVersionId?: string;
        // For verse range addition
        startVerseId?: string;
        endVerseId?: string;
      }
    | undefined;
  EditPlaylistModal:
    | { playlist: import('@/features/playlists/types').Playlist }
    | undefined;
  AddCustomTextToPlaylistModal: {
    playlistId: string;
    playlistTitle: string;
  };
  SearchModal: undefined;
  QuickSelectionModal: undefined;
  EditProfileModal: undefined;
};

// Re-export the navigation types for use in components
export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

// Main App Stack (after onboarding)
const MainAppStack =
  createNativeStackNavigator<Omit<RootStackParamList, 'Onboarding'>>();

// Wrapper component for AuthModal that handles callbacks
const AuthModalWrapper: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();

  const handleAuthComplete = () => {
    // Navigate back to home after successful auth
    navigation.goBack();
  };

  const handleSkipAuth = () => {
    // Navigate back to home if user skips auth
    navigation.goBack();
  };

  return (
    <AuthStackNavigator
      onAuthComplete={handleAuthComplete}
      onSkipAuth={handleSkipAuth}
    />
  );
};

const MainAppNavigator: React.FC = () => {
  const { theme } = useTheme();
  return (
    <MainAppStack.Navigator
      initialRouteName='Home'
      screenOptions={{
        headerShown: false, // Hide React Navigation headers - use custom headers instead
        animation: 'default', // Use platform-specific native animations
        gestureEnabled: true, // Enable swipe-back gesture
        fullScreenGestureEnabled: true, // Enable full-screen swipe gesture on iOS
        animationMatchesGesture: true, // Make animations match gesture interactions
      }}>
      {/* Main app screen */}
      <MainAppStack.Screen
        name='Home'
        component={AppShell}
        options={{
          title: i18n.t('nav.home'),
        }}
      />

      {/* Traditional Modals - For multi-screen flows */}
      <MainAppStack.Screen
        name='MenuModal'
        component={MenuStackNavigator}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('nav.menu'),
        }}
      />

      <MainAppStack.Screen
        name='AuthModal'
        component={AuthModalWrapper}
        options={{
          headerShown: false, // Hide React Navigation headers - use custom headers
          gestureEnabled: true, // Enable swipe-back gesture
          fullScreenGestureEnabled: true, // Enable full-screen swipe gesture on iOS
          animationMatchesGesture: true, // Make animations match gesture interactions
          title: i18n.t('auth.signInOrCreate'),
        }}
      />

      <MainAppStack.Screen
        name='VersionSelectionModal'
        component={VersionSelectionStackNavigator}
        options={{
          presentation: 'modal',
          // animation: 'slide_from_bottom',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('nav.selectVersion'),
        }}
      />

      <MainAppStack.Screen
        name='UserVersionSelectionModal'
        component={UserVersionSelectionModalWrapper}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('versions.selectVersions', {
            defaultValue: 'Select Your Versions',
          }),
        }}
      />

      {/* Add Custom Text to Playlist Modal */}
      <MainAppStack.Screen
        name='AddCustomTextToPlaylistModal'
        component={AddCustomTextToPlaylistScreen}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('playlists.addCustomText'),
        }}
      />

      {/* Add To Playlist Modal */}
      <MainAppStack.Screen
        name='AddToPlaylistModal'
        component={AddToPlaylistModal}
        options={{
          presentation: 'modal',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('playlists.addToPlaylist'),
        }}
      />

      {/* iOS Share Sheet Style Modals - For single-screen flows only */}
      <MainAppStack.Group
        screenOptions={{
          presentation: 'formSheet',
          gestureDirection: 'vertical',
          animation: 'slide_from_bottom',
          sheetAllowedDetents: [0.5, 0.9], // Change this to [0,5,1] to set 50% snap point
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: true,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          contentStyle: {
            backgroundColor: theme.colors.modalBackground,
          },
        }}>
        {/* Download Status Modal with iOS Share Sheet behavior */}
        <MainAppStack.Screen
          name='DownloadStatusModal'
          component={DownloadStatusModal}
          options={{
            title: i18n.t('nav.downloads'),
          }}
        />

        {/* Export Bible Package Modal */}
        <MainAppStack.Screen
          name='ExportBiblePackageModal'
          component={ExportBiblePackageModal}
          options={{
            title: i18n.t('nav.exportBiblePackage'),
          }}
        />

        {/* Export Single Version Modal */}
        <MainAppStack.Screen
          name='ExportVersionModal'
          component={ExportVersionModal}
          options={{
            title: i18n.t('nav.exportVersion'),
          }}
        />

        {/* Import Bible Package Modal */}
        <MainAppStack.Screen
          name='ImportBiblePackageModal'
          component={ImportBiblePackageModal}
          options={{
            title: i18n.t('nav.importBiblePackage'),
          }}
        />

        {/* History Modal */}
        <MainAppStack.Screen
          name='HistoryModal'
          component={HistoryModal}
          options={{
            title: i18n.t('nav.history'),
          }}
        />

        {/* Language Selector Modal */}
        <MainAppStack.Screen
          name='LanguageSelector'
          component={LocaleSelectionModal}
          options={{
            title: i18n.t('onboarding.selectLanguage'),
          }}
        />

        {/* Create Playlist Modal */}
        <MainAppStack.Screen
          name='CreatePlaylistModal'
          component={CreatePlaylistModal}
          options={{
            title: i18n.t('playlists.createPlaylist'),
          }}
        />

        {/* Edit Playlist Modal */}
        <MainAppStack.Screen
          name='EditPlaylistModal'
          component={EditPlaylistModal}
          options={{
            title: i18n.t('playlists.editPlaylist'),
          }}
        />

        {/* Search Modal */}
        <MainAppStack.Screen
          name='SearchModal'
          component={SearchScreen}
          options={{
            title: i18n.t('nav.search'),
          }}
        />

        {/* Quick Selection Modal */}
        <MainAppStack.Screen
          name='QuickSelectionModal'
          component={QuickSelectionNavigator}
          options={{
            title: 'Quick Selection',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        />

        {/* Edit Profile Modal */}
        <MainAppStack.Screen
          name='EditProfileModal'
          component={EditProfileModal}
          options={{
            title: 'Edit Profile',
          }}
        />
      </MainAppStack.Group>

      {/* Deep link screens removed; deep links now target nested Bible routes */}
    </MainAppStack.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { showOnboarding } = useOnboardingStore();

  if (showOnboarding) {
    return <OnboardingStackNavigator />;
  }

  return <MainAppNavigator />;
};

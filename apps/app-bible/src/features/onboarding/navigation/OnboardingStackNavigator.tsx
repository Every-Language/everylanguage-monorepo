import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnlineBibleSetupScreen } from '../screens/OnlineBibleSetupScreen';
import { OfflineBibleSetupScreen } from '../screens/OfflineBibleSetupScreen';
import { LocaleSelectionModal } from '../screens/LocaleSelectionModal';
import { OnboardingAuthScreen } from '../screens/OnboardingAuthScreen';
import { SignInSyncScreen } from '@/features/auth/screens/SignInSyncScreen';
import { PermissionsScreen } from '@/features/permissions/screens/PermissionsScreen';
import { VersionSelectionStackNavigator } from '@/features/languages/navigation/VersionSelectionStackNavigator';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { useTheme } from '@/shared/hooks';
import { i18n } from '@/shared/services';

// Type definitions for the onboarding stack
export type OnboardingStackParamList = {
  Auth: undefined;
  SignInSync: undefined;
  OnboardingMain: undefined;
  MotherTongueSearch: undefined;
  ImportBible: undefined;
  Permissions: undefined;
  LanguageSelector: undefined;
  VersionSelectionModal: {
    versionType: 'audio' | 'text';
    title?: string;
    initialScreen?:
      | 'Versions'
      | 'LanguageSearch'
      | 'LanguageInfo'
      | 'VersionInfo';
  };
};

// Navigation props types
export type OnboardingStackNavigationProp =
  NativeStackNavigationProp<OnboardingStackParamList>;

export type AuthScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'Auth'
>;

export type OnboardingMainScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'OnboardingMain'
>;

export type MotherTongueSearchScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'MotherTongueSearch'
>;

export type ImportBibleScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'ImportBible'
>;

export type PermissionsScreenProps = NativeStackScreenProps<
  OnboardingStackParamList,
  'Permissions'
>;

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

// Wrapper components to handle navigation instead of callbacks
const AuthScreenWrapper: React.FC<AuthScreenProps> = ({ navigation }) => {
  const handleSkipAuth = () => {
    // Navigate to main onboarding screen if user skips auth
    navigation.navigate('OnboardingMain');
  };

  return <OnboardingAuthScreen onSkipAuth={handleSkipAuth} />;
};

const OnboardingMainScreenWrapper: React.FC<OnboardingMainScreenProps> = ({
  navigation,
}) => {
  const { completeOnboarding } = useOnboardingStore();

  return (
    <WelcomeScreen
      onNavigateToMotherTongue={() => navigation.navigate('MotherTongueSearch')}
      onNavigateToImportBible={() => navigation.navigate('ImportBible')}
      onComplete={completeOnboarding}
    />
  );
};

const MotherTongueSearchScreenWrapper: React.FC<
  MotherTongueSearchScreenProps
> = ({ navigation }) => {
  return (
    <OnlineBibleSetupScreen
      onBack={() => navigation.goBack()}
      onComplete={() => navigation.navigate('Permissions')}
      onAudioVersionPress={() =>
        navigation.navigate('VersionSelectionModal', {
          versionType: 'audio',
          title: i18n.t('versions.selectAudioVersion'),
          initialScreen: 'LanguageSearch',
        })
      }
      onTextVersionPress={() =>
        navigation.navigate('VersionSelectionModal', {
          versionType: 'text',
          title: i18n.t('versions.selectTextVersion'),
          initialScreen: 'LanguageSearch',
        })
      }
    />
  );
};

const ImportBibleScreenWrapper: React.FC<ImportBibleScreenProps> = ({
  navigation,
}) => {
  return (
    <OfflineBibleSetupScreen
      onBack={() => navigation.goBack()}
      onComplete={() => navigation.navigate('Permissions')}
    />
  );
};

const PermissionsScreenWrapper: React.FC<PermissionsScreenProps> = ({
  navigation,
}) => {
  const { completeOnboarding } = useOnboardingStore();

  return (
    <PermissionsScreen
      onComplete={completeOnboarding}
      onSkip={completeOnboarding}
      onBack={() => navigation.goBack()}
    />
  );
};

export const OnboardingStackNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <OnboardingStack.Navigator
      initialRouteName='Auth'
      screenOptions={{
        headerShown: false, // Hide React Navigation headers - onboarding has custom UI
        animation: 'slide_from_right', // iOS-style slide animation
        gestureEnabled: true, // Enable swipe-back gesture
        fullScreenGestureEnabled: false, // Disable full-screen swipe for onboarding
        animationMatchesGesture: true, // Make animations match gesture interactions
      }}>
      <OnboardingStack.Screen
        name='Auth'
        component={AuthScreenWrapper}
        options={{
          title: i18n.t('auth.signInOrCreate'),
          gestureEnabled: false, // Disable swipe back on auth screen
        }}
      />
      <OnboardingStack.Screen
        name='SignInSync'
        component={SignInSyncScreen}
        options={{
          title: i18n.t('auth.sync.title'),
          gestureEnabled: false, // Prevent back navigation during sync
          animation: 'none', // No animation for sync screen
        }}
      />
      <OnboardingStack.Screen
        name='OnboardingMain'
        component={OnboardingMainScreenWrapper}
        options={{
          title: i18n.t('onboarding.welcome'),
          gestureEnabled: false, // Disable swipe back on main onboarding
        }}
      />
      <OnboardingStack.Screen
        name='MotherTongueSearch'
        component={MotherTongueSearchScreenWrapper}
        options={{
          title: i18n.t('onboarding.chooseLanguage'),
        }}
      />
      <OnboardingStack.Screen
        name='ImportBible'
        component={ImportBibleScreenWrapper}
        options={{
          title: i18n.t('onboarding.importBible'),
        }}
      />
      <OnboardingStack.Screen
        name='Permissions'
        component={PermissionsScreenWrapper}
        options={{
          title: i18n.t('onboarding.permissions.title'),
          gestureEnabled: false, // Disable swipe back on permissions
        }}
      />

      {/* Version Selection Modal for onboarding */}
      <OnboardingStack.Screen
        name='VersionSelectionModal'
        component={VersionSelectionStackNavigator}
        options={{
          presentation: 'modal', // Traditional modal - slides up from bottom with rounded corners
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('nav.selectVersion'),
        }}
      />

      {/* Language Selector Modal with formSheet presentation */}
      <OnboardingStack.Screen
        name='LanguageSelector'
        component={LocaleSelectionModal}
        options={{
          presentation: 'formSheet',
          gestureDirection: 'vertical',
          animation: 'slide_from_bottom',
          sheetAllowedDetents: [0.5, 0.9],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationMatchesGesture: true,
          title: i18n.t('onboarding.selectLanguage'),
          contentStyle: {
            backgroundColor: theme.colors.modalBackground,
          },
        }}
      />
    </OnboardingStack.Navigator>
  );
};

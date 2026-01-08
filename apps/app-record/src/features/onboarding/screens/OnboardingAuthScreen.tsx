import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useLocalization } from '@/shared/hooks';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { SignOutProgressModal } from '@/features/auth/components/SignOutProgressModal';
import { useSignOutProgress } from '@/features/auth/hooks/useSignOutProgress';
import { signOutProgressService } from '@/shared/services/SignOutProgressService';
import { useOnboardingStore } from '../store/onboardingStore';
import { useState, useEffect } from 'react';

interface OnboardingAuthScreenProps {
  onSkipAuth: () => void;
}

export const OnboardingAuthScreen: React.FC<OnboardingAuthScreenProps> = ({
  onSkipAuth,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { theme } = useTheme();
  const { t } = useLocalization();
  const signOutProgress = useSignOutProgress();
  const { isSignOutInitiated, setSignOutInitiated } = useOnboardingStore();
  // Removed user since we're not using automatic navigation anymore

  const handleSwitchToSignUp = () => setMode('signup');
  const handleSwitchToSignIn = () => setMode('signin');

  // REMOVED: Automatic navigation to OnboardingMain
  // Let the auth flow handle navigation through SignInSync screen
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     // User successfully signed in, redirect to welcome screen
  //     navigation.navigate('OnboardingMain');
  //   }
  // }, [isAuthenticated, navigation]);

  // Handle immediate sign out state
  useEffect(() => {
    if (isSignOutInitiated && !signOutProgress.isVisible) {
      // Start the sign out progress immediately when flag is set
      signOutProgressService.startProgress();
    }
  }, [isSignOutInitiated, signOutProgress.isVisible]);

  const handleProgressModalDismiss = () => {
    // Hide the progress modal when user clicks "Okay"
    signOutProgressService.hideProgress();
    // Clear the sign out initiated flag
    setSignOutInitiated(false);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground },
      ]}>
      <View style={styles.content}>
        {mode === 'signin' ? (
          <SignInForm onSwitchToSignUp={handleSwitchToSignUp} />
        ) : (
          <SignUpForm onSwitchToSignIn={handleSwitchToSignIn} />
        )}
      </View>

      {/* Skip Button */}
      <View style={styles.skipContainer}>
        <TouchableOpacity
          style={[styles.skipButton, { borderColor: theme.colors.border }]}
          onPress={onSkipAuth}>
          <View style={styles.skipButtonContent}>
            <Text
              style={[
                styles.skipButtonText,
                { color: theme.colors.textSecondary },
              ]}>
              {t('auth.skip', { defaultValue: 'Skip for now' })}
            </Text>
            <Ionicons
              name='arrow-forward'
              size={16}
              color={theme.colors.textSecondary}
              style={styles.skipIcon}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Sign-out Progress Modal */}
      <SignOutProgressModal
        visible={signOutProgress.isVisible}
        progress={signOutProgress.progress}
        currentStep={signOutProgress.currentStep}
        isComplete={signOutProgress.isComplete}
        onDismiss={handleProgressModalDismiss}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  skipContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  skipButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  skipIcon: {
    marginLeft: 4,
  },
});

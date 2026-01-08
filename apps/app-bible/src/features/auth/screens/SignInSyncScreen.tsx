import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks/useLocalizationFromStore';
import { useNetwork } from '@/shared/hooks/useNetworkState';
import { useSyncScreenStore } from '../store/syncScreenStore';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { useNavigation } from '@react-navigation/native';
import type { OnboardingStackNavigationProp } from '@/features/onboarding/navigation/OnboardingStackNavigator';
import type { AuthStackNavigationProp } from '@/features/auth/navigation/AuthStackNavigator';
import { userVersionCheckService } from '../services/userVersionCheckService';
import { logger } from '@/shared/utils/logger';

export const SignInSyncScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { isOnline, isConnected } = useNetwork();
  const { showOnboarding } = useOnboardingStore();
  const navigation = useNavigation<
    OnboardingStackNavigationProp | AuthStackNavigationProp
  >();

  const { syncState, retrySync, continueOffline, updateSyncState } =
    useSyncScreenStore();

  // Detect if we're in onboarding context
  const isOnboardingContext = showOnboarding === true;

  // Check versions when sync completes
  useEffect(() => {
    const checkVersions = async () => {
      if (syncState.phase === 'complete' && !syncState.hasVersions) {
        try {
          logger.info(true, 'SignInSyncScreen: Checking user versions...');

          // Get current user ID from auth store
          const { useAuthStore } = await import('@/shared/store/authStore');
          const userId = useAuthStore.getState().userId;

          if (!userId) {
            logger.warn(
              true,
              'SignInSyncScreen: No user ID available for version check'
            );
            return;
          }

          // Check user version needs
          const versionCheck =
            await userVersionCheckService.checkUserVersionNeeds(userId);
          const defaultVersions =
            await userVersionCheckService.getDefaultVersions();

          // Log version information
          logger.info(true, 'SignInSyncScreen: Version check results:', {
            needsVersionSelection: versionCheck.needsVersionSelection,
            hasCurrentSelections: versionCheck.hasCurrentSelections,
            hasSavedVersions: versionCheck.hasSavedVersions,
            hasDefaultVersions: versionCheck.hasDefaultVersions,
            availableAudioVersions: defaultVersions.audio.length,
            availableTextVersions: defaultVersions.text.length,
          });

          // Determine if user can skip onboarding
          const hasVersions =
            versionCheck.hasCurrentSelections || versionCheck.hasSavedVersions;
          const canSkipOnboarding =
            hasVersions && versionCheck.hasDefaultVersions;

          // Update sync state with version info
          updateSyncState({
            hasVersions,
            canSkipOnboarding,
          });
        } catch (error) {
          logger.error(true, 'SignInSyncScreen: Version check failed:', error);
          // Don't fail the sync if version check fails
        }
      }
    };

    checkVersions();
  }, [syncState.phase, syncState.hasVersions, updateSyncState]);

  // Handle manual navigation to onboarding
  const handleGetStarted = () => {
    if (isOnboardingContext) {
      // In onboarding context, navigate to OnboardingMain
      (navigation as OnboardingStackNavigationProp).navigate('OnboardingMain');
    } else {
      // In main app context, close the auth modal
      navigation.getParent()?.goBack();
    }
  };

  // Handle skip onboarding navigation
  const handleSkipOnboarding = () => {
    if (isOnboardingContext) {
      // In onboarding context, navigate to Permissions (skip version selection)
      (navigation as OnboardingStackNavigationProp).navigate('Permissions');
    } else {
      // In main app context, close the auth modal
      navigation.getParent()?.goBack();
    }
  };

  // REMOVED: Automatic navigation on sync completion
  // Now user must click "Get Started" button to proceed
  // useEffect(() => {
  //   if (syncState.phase === 'complete') {
  //     if (isOnboardingContext) {
  //       (navigation as OnboardingStackNavigationProp).navigate('OnboardingMain');
  //     } else {
  //       // In main app context, the auth modal will be closed automatically
  //     }
  //   }
  // }, [syncState.phase, isOnboardingContext, navigation]);

  // Update network status when network state changes
  useEffect(() => {
    const networkStatus =
      !isConnected || !isOnline ? 'disconnected' : 'connected';
    updateSyncState({ networkStatus });
  }, [isConnected, isOnline, updateSyncState]);

  const getNetworkStatusColor = () => {
    switch (syncState.networkStatus) {
      case 'connected':
        return theme.colors.success || '#4CAF50';
      case 'disconnected':
        return theme.colors.error || '#F44336';
      default:
        return theme.colors.text || '#666';
    }
  };

  const getNetworkStatusIcon = () => {
    switch (syncState.networkStatus) {
      case 'connected':
        return 'wifi';
      case 'disconnected':
        return 'wifi-off';
      default:
        return 'wifi';
    }
  };

  const handleRetry = () => {
    retrySync();
  };

  const handleContinueOffline = () => {
    continueOffline();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('auth.sync.title')}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Loading Spinner */}
        <ActivityIndicator
          size='large'
          color={theme.colors.primary}
          style={styles.spinner}
        />

        {/* Message */}
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {syncState.message}
        </Text>

        {/* Progress Bar */}
        {syncState.progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${syncState.progress * 100}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.text }]}>
              {Math.round(syncState.progress * 100)}%
            </Text>
          </View>
        )}

        {/* Network Status */}
        <View style={styles.networkStatus}>
          <MaterialIcons
            name={getNetworkStatusIcon() as keyof typeof MaterialIcons.glyphMap}
            size={20}
            color={getNetworkStatusColor()}
          />
          <Text
            style={[styles.networkText, { color: getNetworkStatusColor() }]}>
            {syncState.networkStatus === 'connected'
              ? t('network.connected')
              : t('network.disconnected')}
          </Text>
        </View>

        {/* Error Message */}
        {syncState.error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: `${theme.colors.error}20` },
            ]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {syncState.error}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {syncState.phase === 'complete' && (
          <>
            {syncState.canSkipOnboarding ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.skipOnboardingButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleSkipOnboarding}>
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.colors.background },
                  ]}>
                  {t('auth.sync.skipOnboarding')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.getStartedButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleGetStarted}>
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.colors.background },
                  ]}>
                  {t('auth.sync.getStarted')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {syncState.phase === 'error' && (
          <>
            {syncState.canRetry && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.retryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleRetry}>
                <Text
                  style={[
                    styles.buttonText,
                    { color: theme.colors.background },
                  ]}>
                  {t('common.retry')}
                </Text>
              </TouchableOpacity>
            )}

            {syncState.canContinueOffline && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.offlineButton,
                  { borderColor: theme.colors.border },
                ]}
                onPress={handleContinueOffline}>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  {t('auth.sync.continueOffline')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  spinner: {
    marginBottom: 30,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  networkText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    // backgroundColor will be set dynamically using theme.colors.error
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 15,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    // backgroundColor set dynamically
  },
  getStartedButton: {
    // backgroundColor set dynamically
  },
  skipOnboardingButton: {
    // backgroundColor set dynamically
  },
  offlineButton: {
    borderWidth: 1,
    // borderColor set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

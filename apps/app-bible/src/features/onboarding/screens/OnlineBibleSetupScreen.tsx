import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useLocalization } from '@/shared/hooks';
import { useNetworkForAction } from '@/shared/hooks/useNetworkState';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import { NoInternetModal } from '@everylanguage/shared-native-ui/components';
import {
  VersionSelectionCard,
  NetworkWarning,
  OnboardingHeader,
} from '../components';
import { logger } from '@/shared/utils/logger';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import { preloadVersionContent, type PreloadProgress } from '../services';

interface OnlineBibileSetupScreenProps {
  onBack: () => void;
  onComplete: () => void;
  onAudioVersionPress?: () => void;
  onTextVersionPress?: () => void;
}

export const OnlineBibleSetupScreen: React.FC<OnlineBibileSetupScreenProps> = ({
  onBack,
  onComplete,
  onAudioVersionPress,
  onTextVersionPress,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { isOnline, ensureNetworkAvailable, retryAndExecute } =
    useNetworkForAction();

  // Get current versions from the new PowerSync-based hook
  const { currentAudioVersion, currentTextVersion } = useVersionsStore();

  // State for modals
  const [showNoInternetModal, setShowNoInternetModal] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] =
    useState<PreloadProgress | null>(null);

  useEffect(() => {
    if (!isOnline) {
      setShowNoInternetModal(true);
    } else {
      setShowNoInternetModal(false);
    }
  }, [isOnline]);

  const handleAudioVersionPress = () => {
    if (onAudioVersionPress) {
      onAudioVersionPress();
    }
  };

  const handleTextVersionPress = () => {
    if (onTextVersionPress) {
      onTextVersionPress();
    }
  };

  const handleContinue = async () => {
    if (!currentAudioVersion) {
      // Require audio version selection
      Alert.alert(
        t('onboarding.onlineSetup.title'),
        t('onboarding.onlineSetup.selectAudioFirst')
      );
      return;
    }

    if (!currentTextVersion) {
      // Require text version selection
      Alert.alert(
        t('onboarding.onlineSetup.title'),
        t('onboarding.onlineSetup.selectTextFirst')
      );
      return;
    }

    try {
      // Ensure network is available before proceeding
      await ensureNetworkAvailable(async () => {
        // Show loading state
        setIsPreloading(true);

        try {
          console.log(
            '[OnlineBibleSetupScreen] 🚀 Starting preloadVersionContent',
            {
              textVersionId: currentTextVersion.id,
              audioVersionId: currentAudioVersion.id,
            }
          );
          // Preload content before completing onboarding
          await preloadVersionContent(
            currentTextVersion.id,
            currentAudioVersion.id,
            progress => {
              console.log(
                '[OnlineBibleSetupScreen] 📊 Progress update:',
                progress
              );
              setPreloadProgress(progress);
            }
          );
          console.log('[OnlineBibleSetupScreen] ✅ Preload complete');
        } catch (preloadError) {
          // Log error but continue - graceful degradation
          logger.warn(
            ENABLE_LOGGING,
            'Preload failed, continuing anyway:',
            preloadError
          );
        } finally {
          setIsPreloading(false);
          setPreloadProgress(null);
        }

        // Complete onboarding
        onComplete();
      });
    } catch (error) {
      logger.debug(
        ENABLE_LOGGING,
        'OnboardingVersionSelectionScreen: Network not available for continue action:',
        error
      );
      setShowNoInternetModal(true);
    }
  };

  const handleRetryConnection = async () => {
    try {
      // Use the retry and execute method
      await retryAndExecute(async () => {
        setShowNoInternetModal(false);

        // Show loading state
        setIsPreloading(true);

        try {
          // Preload content before completing onboarding
          await preloadVersionContent(
            currentTextVersion?.id ?? null,
            currentAudioVersion?.id ?? null,
            progress => {
              setPreloadProgress(progress);
            }
          );
        } catch (preloadError) {
          // Log error but continue - graceful degradation
          logger.warn(
            ENABLE_LOGGING,
            'Preload failed, continuing anyway:',
            preloadError
          );
        } finally {
          setIsPreloading(false);
          setPreloadProgress(null);
        }

        onComplete();
      });
    } catch (error) {
      logger.debug(
        ENABLE_LOGGING,
        'MotherTongueSearchScreen: Retry failed:',
        error
      );
      // Modal will stay open if retry fails
    }
  };

  const canContinue = !!currentAudioVersion && !!currentTextVersion;

  const handleDisabledButtonPress = () => {
    Alert.alert(
      t('onboarding.onlineSetup.title'),
      t('onboarding.onlineSetup.continueDisabledTooltip')
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingHeader
        title={t('onboarding.onlineSetup.title')}
        subtitle={t('onboarding.onlineSetup.subtitle')}
        showBackButton={true}
        onBack={onBack}
        showControls={true}
      />

      <View style={styles.content}>
        {/* Network Status Warning */}
        {!isOnline && (
          <NetworkWarning
            message={t('onboarding.onlineSetup.networkRequired')}
          />
        )}

        {/* Version Selection Cards */}
        <View style={styles.cardsContainer}>
          <VersionSelectionCard
            type='audio'
            title={t('onboarding.onlineSetup.audioVersion')}
            subtitle={t('onboarding.onlineSetup.audioSubtitle')}
            currentVersion={currentAudioVersion}
            onPress={handleAudioVersionPress}
            isSelected={!!currentAudioVersion}
          />

          <VersionSelectionCard
            type='text'
            title={t('onboarding.onlineSetup.textVersion')}
            subtitle={t('onboarding.onlineSetup.textSubtitle')}
            currentVersion={currentTextVersion}
            onPress={handleTextVersionPress}
            isSelected={!!currentTextVersion}
          />
        </View>

        {/* Helpful Comment */}
        <View style={styles.helpTextContainer}>
          <Text
            style={[styles.helpText, { color: theme.colors.textSecondary }]}>
            {t('onboarding.onlineSetup.helpText')}
          </Text>
        </View>

        {/* Progress Indicator */}
        {isPreloading && preloadProgress && (
          <View
            style={[
              styles.progressContainer,
              { backgroundColor: theme.colors.surface },
            ]}>
            <View style={styles.progressHeader}>
              <ActivityIndicator
                size='small'
                color={theme.colors.primary}
                style={styles.progressSpinner}
              />
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                {preloadProgress.type === 'verse_texts'
                  ? t('onboarding.onlineSetup.downloadingVerses', {
                      defaultValue: 'Downloading verses',
                    })
                  : t('onboarding.onlineSetup.downloadingMedia', {
                      defaultValue: 'Downloading media',
                    })}
              </Text>
            </View>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(preloadProgress.current / preloadProgress.total) * 100}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressCount,
                { color: theme.colors.textSecondary },
              ]}>
              {preloadProgress.current} / {preloadProgress.total}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor:
                canContinue && !isPreloading
                  ? theme.colors.primary
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={
            canContinue && !isPreloading
              ? handleContinue
              : handleDisabledButtonPress
          }
          disabled={!canContinue || isPreloading}>
          <Text
            style={[
              styles.continueButtonText,
              { color: theme.colors.textInverse },
            ]}>
            {isPreloading
              ? t('onboarding.onlineSetup.loading', {
                  defaultValue: 'Loading...',
                })
              : t('onboarding.onlineSetup.continue')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <NoInternetModal
        visible={showNoInternetModal && !isOnline}
        onRetry={handleRetryConnection}
        onClose={() => setShowNoInternetModal(false)}
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
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 10,
    paddingBottom: 120,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    flex: 1,
  },
  progressContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressSpinner: {
    marginRight: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressCount: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    padding: 20,
    paddingTop: 24,
  },
  continueButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

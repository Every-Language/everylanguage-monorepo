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
import {
  preloadVersionContent,
  type PreloadProgress,
  type PreloadStatus,
} from '../services';
import {
  PrioritySyncMonitor,
  type SyncProgress,
} from '../services/prioritySyncMonitor';
import { userVersionsService } from '@/features/languages/services/userVersionsService';
import { useAuthStore } from '@/shared/store/authStore';

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

  // Get user ID for sync monitoring
  const userId = useAuthStore(state => state.userId);

  // State for modals
  const [showNoInternetModal, setShowNoInternetModal] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] =
    useState<PreloadProgress | null>(null);
  const [preloadStatus, setPreloadStatus] = useState<PreloadStatus | null>(
    null
  );
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Throttle progress updates to prevent UI lag
  const lastProgressUpdate = React.useRef<number>(0);
  const PROGRESS_UPDATE_THROTTLE = 200; // Max once per 200ms

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

    if (!userId) {
      Alert.alert(
        t('onboarding.onlineSetup.title'),
        'Please sign in to continue'
      );
      return;
    }

    try {
      // Ensure network is available before proceeding
      await ensureNetworkAvailable(async () => {
        // Show loading state immediately
        setIsPreloading(true);
        setSyncProgress(null);
        setPreloadProgress(null);
        setPreloadStatus(null);
        setStatusMessage('Saving your selections...');

        try {
          logger.info(
            ENABLE_LOGGING,
            '[OnlineBibleSetupScreen] Starting hybrid sync method',
            {
              textVersionId: currentTextVersion.id,
              audioVersionId: currentAudioVersion.id,
              userId,
            }
          );

          // Step 1: Save versions FIRST (this triggers PowerSync sync)
          logger.debug(
            ENABLE_LOGGING,
            '[OnlineBibleSetupScreen] Saving versions...'
          );
          setStatusMessage('Saving your selections...');
          await userVersionsService.addSavedVersion(currentTextVersion, 'text');
          await userVersionsService.addSavedVersion(
            currentAudioVersion,
            'audio'
          );
          logger.debug(
            ENABLE_LOGGING,
            '[OnlineBibleSetupScreen] Versions saved'
          );

          // Step 2: Try PowerSync priority sync first (faster, more efficient)
          logger.debug(
            ENABLE_LOGGING,
            '[OnlineBibleSetupScreen] Attempting PowerSync priority sync...'
          );
          let currentSyncMethod: 'powersync' | 'preload' = 'powersync';
          setStatusMessage('Connecting to server...');

          try {
            const monitor = new PrioritySyncMonitor({
              userId,
              checkInterval: 1000, // Check every second
              timeout: 30000, // 30 second timeout
            });

            // Subscribe to progress updates with throttling
            const unsubscribe = monitor.subscribe(progress => {
              const now = Date.now();
              if (
                now - lastProgressUpdate.current >= PROGRESS_UPDATE_THROTTLE ||
                progress.phase === 'complete'
              ) {
                setSyncProgress(progress);
                setStatusMessage(progress.message);
                lastProgressUpdate.current = now;
                logger.debug(
                  ENABLE_LOGGING,
                  '[OnlineBibleSetupScreen] Sync progress:',
                  progress
                );
              }
            });

            // Wait for priority 1 sync to complete (starts monitoring immediately)
            const syncComplete = await monitor.waitForPriority1Complete();
            unsubscribe();
            monitor.stopMonitoring();

            if (syncComplete) {
              // PowerSync sync completed successfully
              logger.info(
                ENABLE_LOGGING,
                '[OnlineBibleSetupScreen] PowerSync sync complete'
              );
              setSyncProgress({
                phase: 'complete',
                progress: 1.0,
                message: 'Essential content ready',
                priority1Complete: true,
              });
              setStatusMessage('Essential content ready');
            } else {
              // PowerSync sync timed out, fallback to preload
              logger.warn(
                ENABLE_LOGGING,
                '[OnlineBibleSetupScreen] PowerSync sync timeout, falling back to preload...'
              );
              currentSyncMethod = 'preload';
              setSyncProgress(null);
              setStatusMessage('Preparing to download...');

              await preloadVersionContent(
                currentTextVersion.id,
                currentAudioVersion.id,
                progress => {
                  const now = Date.now();
                  if (
                    now - lastProgressUpdate.current >=
                      PROGRESS_UPDATE_THROTTLE ||
                    progress.current === progress.total
                  ) {
                    setPreloadProgress(progress);
                    lastProgressUpdate.current = now;
                    logger.debug(
                      ENABLE_LOGGING,
                      '[OnlineBibleSetupScreen] Preload progress:',
                      progress
                    );
                  }
                },
                status => {
                  const now = Date.now();
                  if (
                    now - lastProgressUpdate.current >=
                      PROGRESS_UPDATE_THROTTLE ||
                    status.phase === 'complete' ||
                    status.phase === 'retrying'
                  ) {
                    setPreloadStatus(status);
                    setStatusMessage(status.message);
                    lastProgressUpdate.current = now;
                    logger.debug(
                      ENABLE_LOGGING,
                      '[OnlineBibleSetupScreen] Preload status:',
                      status
                    );
                  }
                }
              );
              logger.info(
                ENABLE_LOGGING,
                '[OnlineBibleSetupScreen] Preload complete'
              );
            }
          } catch (syncError) {
            // If PowerSync monitoring fails, fallback to preload
            logger.warn(
              ENABLE_LOGGING,
              'PowerSync sync failed, falling back to preload:',
              syncError
            );

            if (currentSyncMethod !== 'preload') {
              currentSyncMethod = 'preload';
              setSyncProgress(null);
              setStatusMessage('Preparing to download...');

              try {
                await preloadVersionContent(
                  currentTextVersion.id,
                  currentAudioVersion.id,
                  progress => {
                    const now = Date.now();
                    if (
                      now - lastProgressUpdate.current >=
                        PROGRESS_UPDATE_THROTTLE ||
                      progress.current === progress.total
                    ) {
                      setPreloadProgress(progress);
                      lastProgressUpdate.current = now;
                    }
                  },
                  status => {
                    const now = Date.now();
                    if (
                      now - lastProgressUpdate.current >=
                        PROGRESS_UPDATE_THROTTLE ||
                      status.phase === 'complete' ||
                      status.phase === 'retrying'
                    ) {
                      setPreloadStatus(status);
                      setStatusMessage(status.message);
                      lastProgressUpdate.current = now;
                    }
                  }
                );
              } catch (preloadError) {
                // Log error but continue - graceful degradation
                logger.warn(
                  ENABLE_LOGGING,
                  'Preload also failed, continuing anyway:',
                  preloadError
                );
              }
            }
          }
        } finally {
          setIsPreloading(false);
          setSyncProgress(null);
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
    if (!userId || !currentTextVersion || !currentAudioVersion) {
      return;
    }

    try {
      // Use the retry and execute method
      await retryAndExecute(async () => {
        setShowNoInternetModal(false);

        // Show loading state immediately
        setIsPreloading(true);
        setSyncProgress(null);
        setPreloadProgress(null);
        setPreloadStatus(null);
        setStatusMessage('Saving your selections...');

        try {
          // Save versions first
          setStatusMessage('Saving your selections...');
          await userVersionsService.addSavedVersion(currentTextVersion, 'text');
          await userVersionsService.addSavedVersion(
            currentAudioVersion,
            'audio'
          );

          // Try PowerSync sync
          let currentSyncMethod: 'powersync' | 'preload' = 'powersync';
          setStatusMessage('Connecting to server...');

          try {
            const monitor = new PrioritySyncMonitor({
              userId,
              checkInterval: 1000,
              timeout: 30000,
            });

            const unsubscribe = monitor.subscribe(progress => {
              const now = Date.now();
              if (
                now - lastProgressUpdate.current >= PROGRESS_UPDATE_THROTTLE ||
                progress.phase === 'complete'
              ) {
                setSyncProgress(progress);
                setStatusMessage(progress.message);
                lastProgressUpdate.current = now;
              }
            });

            const syncComplete = await monitor.waitForPriority1Complete();
            unsubscribe();
            monitor.stopMonitoring();

            if (!syncComplete) {
              // Fallback to preload
              currentSyncMethod = 'preload';
              setSyncProgress(null);
              setStatusMessage('Preparing to download...');
              await preloadVersionContent(
                currentTextVersion.id,
                currentAudioVersion.id,
                progress => {
                  const now = Date.now();
                  if (
                    now - lastProgressUpdate.current >=
                      PROGRESS_UPDATE_THROTTLE ||
                    progress.current === progress.total
                  ) {
                    setPreloadProgress(progress);
                    lastProgressUpdate.current = now;
                  }
                },
                status => {
                  const now = Date.now();
                  if (
                    now - lastProgressUpdate.current >=
                      PROGRESS_UPDATE_THROTTLE ||
                    status.phase === 'complete' ||
                    status.phase === 'retrying'
                  ) {
                    setPreloadStatus(status);
                    setStatusMessage(status.message);
                    lastProgressUpdate.current = now;
                  }
                }
              );
            }
          } catch (syncError) {
            // Fallback to preload on error
            logger.warn(
              ENABLE_LOGGING,
              '[OnlineBibleSetupScreen] PowerSync sync failed, falling back to preload:',
              syncError
            );
            if (currentSyncMethod !== 'preload') {
              currentSyncMethod = 'preload';
              setSyncProgress(null);
              setStatusMessage('Preparing to download...');
              try {
                await preloadVersionContent(
                  currentTextVersion.id,
                  currentAudioVersion.id,
                  progress => {
                    const now = Date.now();
                    if (
                      now - lastProgressUpdate.current >=
                        PROGRESS_UPDATE_THROTTLE ||
                      progress.current === progress.total
                    ) {
                      setPreloadProgress(progress);
                      lastProgressUpdate.current = now;
                    }
                  },
                  status => {
                    const now = Date.now();
                    if (
                      now - lastProgressUpdate.current >=
                        PROGRESS_UPDATE_THROTTLE ||
                      status.phase === 'complete' ||
                      status.phase === 'retrying'
                    ) {
                      setPreloadStatus(status);
                      setStatusMessage(status.message);
                      lastProgressUpdate.current = now;
                    }
                  }
                );
              } catch (preloadError) {
                logger.warn(
                  ENABLE_LOGGING,
                  '[OnlineBibleSetupScreen] Preload failed, continuing anyway:',
                  preloadError
                );
              }
            }
          }
        } catch (error) {
          // Final fallback if everything fails
          logger.warn(ENABLE_LOGGING, 'Sync process failed completely:', error);
        } finally {
          setIsPreloading(false);
          setSyncProgress(null);
          setPreloadProgress(null);
          setPreloadStatus(null);
        }

        onComplete();
      });
    } catch (error) {
      logger.debug(
        ENABLE_LOGGING,
        'OnlineBibleSetupScreen: Retry failed:',
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

        {/* Progress Indicator - Show immediately when preloading */}
        {isPreloading && (
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
                {statusMessage ||
                  (syncProgress
                    ? syncProgress.message
                    : preloadStatus
                      ? preloadStatus.message
                      : preloadProgress?.type === 'verse_texts'
                        ? t('onboarding.onlineSetup.downloadingVerses', {
                            defaultValue: 'Downloading verses',
                          })
                        : t('onboarding.onlineSetup.downloadingMedia', {
                            defaultValue: 'Downloading media',
                          }))}
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
                    width: `${
                      syncProgress
                        ? syncProgress.progress * 100
                        : preloadStatus
                          ? preloadStatus.progress * 100
                          : preloadProgress
                            ? (preloadProgress.current /
                                preloadProgress.total) *
                              100
                            : 0
                    }%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
            {/* Retry indicator */}
            {preloadStatus?.retryCount !== undefined &&
              preloadStatus.retryCount > 0 && (
                <Text
                  style={[
                    styles.progressCount,
                    {
                      color: theme.colors.warning || theme.colors.textSecondary,
                    },
                  ]}>
                  Retrying... ({preloadStatus.retryCount}/
                  {preloadStatus.retryMax || 3})
                </Text>
              )}
            {/* Sync progress details */}
            {syncProgress && syncProgress.priority1Complete && (
              <Text
                style={[
                  styles.progressCount,
                  { color: theme.colors.success || theme.colors.primary },
                ]}>
                {syncProgress.verseTextsCount !== undefined &&
                syncProgress.mediaFilesCount !== undefined
                  ? `Ready: ${syncProgress.verseTextsCount} verses, ${syncProgress.mediaFilesCount} media files`
                  : 'Essential content ready'}
              </Text>
            )}
            {/* Preload progress details */}
            {preloadProgress && !preloadStatus?.retryCount && (
              <Text
                style={[
                  styles.progressCount,
                  { color: theme.colors.textSecondary },
                ]}>
                {preloadProgress.current} / {preloadProgress.total}
                {preloadStatus?.total &&
                  ` (${Math.round(
                    (preloadProgress.current / preloadProgress.total) * 100
                  )}%)`}
              </Text>
            )}
            {/* Status-based progress */}
            {preloadStatus &&
              !preloadProgress &&
              preloadStatus.current !== undefined &&
              preloadStatus.total !== undefined && (
                <Text
                  style={[
                    styles.progressCount,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {preloadStatus.current} / {preloadStatus.total}
                  {` (${Math.round(preloadStatus.progress * 100)}%)`}
                </Text>
              )}
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

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
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
import { logger } from '@/shared/utils/logger';
import { useAuthStore } from '@/shared/store/authStore';
import { userVersionSupabaseService } from '../services/userVersionSupabaseService';
import type { UserVersionData } from '../services/userVersionSupabaseService';
import { NoNetworkModal } from '../components/NoNetworkModal';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

const SEED_WAIT_TIMEOUT_MS = 15000;
const USER_DATA_POLL_TIMEOUT_MS = 10000;
const USER_DATA_POLL_INTERVAL_MS = 500;

/** Poll local PowerSync DB for user_current_selections row for userId; resolve when found or after timeout. */
async function waitForUserDataInLocalDB(userId: string): Promise<void> {
  if (!powerSyncSystem.isInitialized) return;
  const deadline = Date.now() + USER_DATA_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const result = (await powerSyncSystem.get(
        'SELECT COUNT(*) as count FROM user_current_selections WHERE user_id = ?',
        [userId]
      )) as { count?: number } | undefined;
      if (Number(result?.count ?? 0) > 0) return;
    } catch {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, USER_DATA_POLL_INTERVAL_MS));
  }
}

export const SignInSyncScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { isOnline, isConnected } = useNetwork();
  const { showOnboarding } = useOnboardingStore();
  const navigation = useNavigation<
    OnboardingStackNavigationProp | AuthStackNavigationProp
  >();
  const { userId } = useAuthStore();

  const { syncState, retrySync, continueOffline, updateSyncState } =
    useSyncScreenStore();

  const [showNoNetworkModal, setShowNoNetworkModal] = useState(false);
  const [userVersionData, setUserVersionData] =
    useState<UserVersionData | null>(null);
  const [versionDataLoading, setVersionDataLoading] = useState(false);
  const [versionDataFetched, setVersionDataFetched] = useState(false);
  const [isPreparingForSkip, setIsPreparingForSkip] = useState(false);
  const [preparingMessage, setPreparingMessage] = useState<string | null>(null);

  const isOnboardingContext = showOnboarding === true;

  const fetchUserVersionData = useCallback(async () => {
    if (!userId) return;
    if (!isOnline || !isConnected) {
      setShowNoNetworkModal(true);
      return;
    }
    setVersionDataLoading(true);
    setVersionDataFetched(true);
    try {
      const data = await userVersionSupabaseService.getUserVersionData(userId);
      setUserVersionData(data);
      const hasData =
        (data.currentSelections &&
          (data.currentSelections.current_audio_version_id != null ||
            data.currentSelections.current_text_version_id != null)) ||
        data.savedAudioVersions.length > 0 ||
        data.savedTextVersions.length > 0;
      updateSyncState({
        hasUserDataFromServer: hasData,
        hasSavedVersions: hasData,
        hasVersions: hasData,
        canSkipOnboarding: hasData,
      });
    } catch (e) {
      logger.warn(true, 'SignInSyncScreen: fetchUserVersionData failed', e);
      setUserVersionData(null);
    } finally {
      setVersionDataLoading(false);
    }
  }, [userId, isOnline, isConnected, updateSyncState]);

  useEffect(() => {
    if (
      syncState.phase === 'complete' &&
      userId &&
      !versionDataFetched &&
      !versionDataLoading
    ) {
      if (!isConnected || !isOnline) {
        setShowNoNetworkModal(true);
        setVersionDataFetched(true);
        return;
      }
      void fetchUserVersionData();
    }
  }, [
    syncState.phase,
    userId,
    versionDataFetched,
    versionDataLoading,
    isOnline,
    isConnected,
    fetchUserVersionData,
  ]);

  useEffect(() => {
    const networkStatus =
      !isConnected || !isOnline ? 'disconnected' : 'connected';
    updateSyncState({ networkStatus });
  }, [isConnected, isOnline, updateSyncState]);

  const handleGetStarted = () => {
    if (isOnboardingContext) {
      (navigation as OnboardingStackNavigationProp).navigate('OnboardingMain');
    } else {
      navigation.getParent()?.goBack();
    }
  };

  const handleSkipOnboarding = async () => {
    if (!isOnboardingContext) {
      navigation.getParent()?.goBack();
      return;
    }
    if (syncState.canSkipOnboarding && userId) {
      setIsPreparingForSkip(true);
      setPreparingMessage(t('auth.sync.preparingBible'));
      try {
        await powerSyncSystem.waitUntilSeededWithTimeout(SEED_WAIT_TIMEOUT_MS);
        setPreparingMessage(t('auth.sync.syncingData'));
        await waitForUserDataInLocalDB(userId);
      } catch (e) {
        logger.warn(true, 'SignInSyncScreen: prepare for skip failed', e);
      } finally {
        setIsPreparingForSkip(false);
        setPreparingMessage(null);
      }
    }
    (navigation as OnboardingStackNavigationProp).navigate('Permissions');
  };

  const handleRetryVersionData = useCallback(() => {
    setVersionDataFetched(false);
    setUserVersionData(null);
    void fetchUserVersionData();
  }, [fetchUserVersionData]);

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

  const renderVersionDataSection = () => {
    if (syncState.phase !== 'complete') return null;
    if (versionDataLoading) {
      return (
        <View style={styles.versionDataSection}>
          <Text style={[styles.versionDataLabel, { color: theme.colors.text }]}>
            {t('auth.sync.loadingVersions')}
          </Text>
          <ActivityIndicator size='small' color={theme.colors.primary} />
          <TouchableOpacity
            style={[
              styles.retryVersionButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={handleRetryVersionData}
            disabled={versionDataLoading}>
            <Text
              style={[styles.retryVersionText, { color: theme.colors.text }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!userVersionData) {
      return (
        <View style={styles.versionDataSection}>
          <TouchableOpacity
            style={[
              styles.retryVersionButton,
              { borderColor: theme.colors.primary },
            ]}
            onPress={handleRetryVersionData}>
            <Text
              style={[
                styles.retryVersionText,
                { color: theme.colors.primary },
              ]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { currentSelections, savedTextVersions, savedAudioVersions } =
      userVersionData;
    const audioId = currentSelections?.current_audio_version_id ?? null;
    const textId = currentSelections?.current_text_version_id ?? null;

    return (
      <ScrollView
        style={styles.versionDataScroll}
        contentContainerStyle={styles.versionDataScrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.versionDataSection}>
          <Text style={[styles.versionDataTitle, { color: theme.colors.text }]}>
            {t('auth.sync.currentSelections')}
          </Text>
          <Text
            style={[
              styles.versionDataRow,
              { color: theme.colors.textSecondary ?? theme.colors.text },
            ]}>
            Audio: {audioId ?? t('auth.sync.noSelection')}
          </Text>
          <Text
            style={[
              styles.versionDataRow,
              { color: theme.colors.textSecondary ?? theme.colors.text },
            ]}>
            Text: {textId ?? t('auth.sync.noSelection')}
          </Text>
        </View>

        <View style={styles.versionDataSection}>
          <Text style={[styles.versionDataTitle, { color: theme.colors.text }]}>
            {t('auth.sync.savedTextVersions')} ({savedTextVersions.length})
          </Text>
          {savedTextVersions.length === 0 ? (
            <Text
              style={[
                styles.versionDataRow,
                { color: theme.colors.textSecondary ?? theme.colors.text },
              ]}>
              {t('auth.sync.noSelection')}
            </Text>
          ) : (
            savedTextVersions.map(row => (
              <Text
                key={row.id}
                style={[
                  styles.versionDataRow,
                  { color: theme.colors.textSecondary ?? theme.colors.text },
                ]}>
                {row.text_version_id}
              </Text>
            ))
          )}
        </View>

        <View style={styles.versionDataSection}>
          <Text style={[styles.versionDataTitle, { color: theme.colors.text }]}>
            {t('auth.sync.savedAudioVersions')} ({savedAudioVersions.length})
          </Text>
          {savedAudioVersions.length === 0 ? (
            <Text
              style={[
                styles.versionDataRow,
                { color: theme.colors.textSecondary ?? theme.colors.text },
              ]}>
              {t('auth.sync.noSelection')}
            </Text>
          ) : (
            savedAudioVersions.map(row => (
              <Text
                key={row.id}
                style={[
                  styles.versionDataRow,
                  { color: theme.colors.textSecondary ?? theme.colors.text },
                ]}>
                {row.audio_version_id}
              </Text>
            ))
          )}
        </View>

        <View style={styles.versionDataSection}>
          <TouchableOpacity
            style={[
              styles.retryVersionButton,
              { borderColor: theme.colors.border },
            ]}
            onPress={handleRetryVersionData}>
            <Text
              style={[styles.retryVersionText, { color: theme.colors.text }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('auth.sync.title')}
        </Text>
      </View>

      <View style={styles.content}>
        <ActivityIndicator
          size='large'
          color={theme.colors.primary}
          style={styles.spinner}
        />
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {preparingMessage ?? syncState.message}
        </Text>

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

        {renderVersionDataSection()}

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
                onPress={handleSkipOnboarding}
                disabled={isPreparingForSkip}>
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
                onPress={() => retrySync()}>
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
                onPress={() => continueOffline()}>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  {t('auth.sync.continueOffline')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <NoNetworkModal
        visible={showNoNetworkModal}
        onDismiss={() => setShowNoNetworkModal(false)}
      />
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
  versionDataScroll: {
    width: '100%',
    maxHeight: 220,
  },
  versionDataScrollContent: {
    paddingBottom: 16,
  },
  versionDataSection: {
    marginBottom: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  versionDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  versionDataLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  versionDataRow: {
    fontSize: 13,
    marginBottom: 2,
  },
  retryVersionButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  retryVersionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
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
  retryButton: {},
  getStartedButton: {},
  skipOnboardingButton: {},
  offlineButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

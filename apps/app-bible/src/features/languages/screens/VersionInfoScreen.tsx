import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type {
  VersionInfoScreenProps,
  VersionSelectionStackNavigationProp,
} from '../navigation/VersionSelectionStackNavigator';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { ModalHeader } from '@everylanguage/shared-native-ui';
import { useVersionCompleteness } from '../hooks/useVersionCompleteness';
import type { AudioVersion, TextVersion } from '../types/entities';
import { useVersionsStore } from '../store/versionsStore';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useVersionDownloads } from '@/features/downloads/hooks';
import { useVersionDownloadActions } from '@/features/downloads/components';
import { logger } from '@/shared/utils/logger';
import { useNetworkForAction } from '@/shared/hooks';
import { NoInternetModal } from '@everylanguage/shared-native-ui';

export const VersionInfoScreen: React.FC<VersionInfoScreenProps> = ({
  route,
}) => {
  const { versionType } = route.params;
  const initialVersion = route.params.version as
    | AudioVersion
    | TextVersion
    | undefined;
  const { theme } = useTheme();
  const { t } = useLocalization();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<VersionSelectionStackNavigationProp>();
  const {
    setCurrentAudioVersion,
    setCurrentTextVersion,
    isVersionSaved,
    textVersionDownloadProgress,
  } = useVersionsStore();

  const { isOnline, ensureNetworkAvailable, retryAndExecute } =
    useNetworkForAction();

  const [showNoInternetModal, setShowNoInternetModal] = useState(false);

  const preselected: AudioVersion | TextVersion | null = useMemo(() => {
    return initialVersion ?? null;
  }, [initialVersion]);

  const [selectedVersion, setSelectedVersion] = useState<
    AudioVersion | TextVersion | null
  >(null);
  React.useEffect(() => {
    setSelectedVersion(preselected);
  }, [preselected]);

  const { loading, languageName, ot, nt } = useVersionCompleteness(
    selectedVersion,
    versionType
  );

  // Download status (audio only)
  const { isDownloadEnabled, downloadedFiles, totalFiles, toggleDownload } =
    useVersionDownloads({
      versionIds:
        selectedVersion && versionType === 'audio' ? [selectedVersion.id] : [],
      enabled: !!selectedVersion && versionType === 'audio',
      realtime: true,
    });

  const { handleRemoveDownloadedVersion, handleDownloadVersion } =
    useVersionDownloadActions({
      onToggleDownload: async (versionId: string) => {
        await toggleDownload(versionId);
      },
    });

  // Export state (prevent double tap)
  const [isExporting, setIsExporting] = useState(false);

  const handleBackToVersions = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isSelectedSaved = selectedVersion
    ? isVersionSaved(selectedVersion.id, versionType)
    : false;

  const isDownloadingText =
    versionType === 'text' &&
    textVersionDownloadProgress?.isDownloading === true &&
    textVersionDownloadProgress.versionId === selectedVersion?.id;

  const footerCtaLabel = useMemo(() => {
    if (!selectedVersion) return 'Select a version';
    if (isDownloadingText) return 'Loading...';
    if (isSelectedSaved)
      return versionType === 'audio' ? 'Listen to version' : 'Read version';
    return 'Add to my saved versions';
  }, [selectedVersion, isSelectedSaved, versionType, isDownloadingText]);

  const onFooterPress = useCallback(async () => {
    if (!selectedVersion) return;
    if (isDownloadingText) return; // Prevent action while downloading

    try {
      const overallStart = Date.now();
      logger.info(ENABLE_LOGGING, '[Versions] Saving selection start', {
        screen: 'VersionInfo',
        versionType,
        versionId: selectedVersion.id,
      });

      if (versionType === 'audio') {
        const t1 = Date.now();
        logger.info(ENABLE_LOGGING, '[Versions] setCurrentAudioVersion begin', {
          versionId: selectedVersion.id,
        });
        await setCurrentAudioVersion(selectedVersion as AudioVersion);
        logger.info(ENABLE_LOGGING, '[Versions] setCurrentAudioVersion done', {
          durationMs: Date.now() - t1,
        });
        navigation.getParent()?.goBack();
      } else {
        // Text version - check network before sync/preload
        try {
          await ensureNetworkAvailable(async () => {
            const t2 = Date.now();
            logger.info(
              ENABLE_LOGGING,
              '[Versions] setCurrentTextVersion begin',
              {
                versionId: selectedVersion.id,
              }
            );

            // Check if text is already downloaded (quick check)
            const { powerSyncSystem } =
              await import('@/shared/services/powersync/PowerSyncSystem');
            let isTextDownloaded = false;
            try {
              const countResult = await powerSyncSystem.getAll<{
                count: number;
              }>(
                'SELECT COUNT(*) as count FROM verse_texts WHERE text_version_id = ? LIMIT 1',
                [selectedVersion.id]
              );
              isTextDownloaded = (countResult[0]?.count ?? 0) > 0;
            } catch {
              // Ignore check errors
            }

            // If text is already downloaded, no network needed
            if (isTextDownloaded) {
              await setCurrentTextVersion(selectedVersion as TextVersion);
              logger.info(
                ENABLE_LOGGING,
                '[Versions] setCurrentTextVersion done (fast path)',
                {
                  durationMs: Date.now() - t2,
                }
              );
              navigation.getParent()?.goBack();
              return;
            }

            // Text not downloaded - need network for sync/preload
            // setCurrentTextVersion will handle sync/preload
            await setCurrentTextVersion(selectedVersion as TextVersion);
            logger.info(
              ENABLE_LOGGING,
              '[Versions] setCurrentTextVersion done (sync/preload)',
              {
                durationMs: Date.now() - t2,
              }
            );

            // Wait for download to complete before closing
            // In a real scenario, you might want to show progress or allow user to navigate away
            // For now, we'll close immediately and let download continue in background
            navigation.getParent()?.goBack();
          });
        } catch (networkError) {
          logger.debug(
            ENABLE_LOGGING,
            '[Versions] Network not available for text version selection:',
            networkError
          );
          setShowNoInternetModal(true);
          return;
        }
      }

      logger.info(ENABLE_LOGGING, '[Versions] Modal closed after save', {
        totalMs: Date.now() - overallStart,
      });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[Versions] VersionInfo: selection failed',
        error
      );
    }
  }, [
    selectedVersion,
    versionType,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    navigation,
    isDownloadingText,
    ensureNetworkAvailable,
  ]);

  const handleRetryConnection = useCallback(async () => {
    if (!selectedVersion || versionType !== 'text') return;

    try {
      await retryAndExecute(async () => {
        setShowNoInternetModal(false);
        await setCurrentTextVersion(selectedVersion as TextVersion);
        navigation.getParent()?.goBack();
      });
    } catch (error) {
      logger.debug(
        ENABLE_LOGGING,
        '[Versions] Retry connection failed:',
        error
      );
      // Modal will stay open
    }
  }, [
    selectedVersion,
    versionType,
    retryAndExecute,
    setCurrentTextVersion,
    navigation,
  ]);

  // Save / Remove saved version (unused currently — kept for future)

  // Download actions (audio only)
  const onPressDownload = useCallback(() => {
    if (!selectedVersion || versionType !== 'audio') return;
    const item = {
      id: selectedVersion.id,
      name: selectedVersion.name,
      total_files: totalFiles,
    };
    if (isDownloadEnabled && downloadedFiles > 0) {
      handleRemoveDownloadedVersion(item);
    } else {
      handleDownloadVersion(item);
    }
  }, [
    selectedVersion,
    versionType,
    totalFiles,
    isDownloadEnabled,
    downloadedFiles,
    handleRemoveDownloadedVersion,
    handleDownloadVersion,
  ]);

  // Export confirmation -> navigate to modal
  const onExport = useCallback(() => {
    if (!selectedVersion) return;
    // simple confirmation
    // defer heavy work to ExportVersionModal
    // We keep a local exporting flag to prevent double taps
    if (isExporting) return;
    setIsExporting(true);
    try {
      const rootNav = navigation.getParent() as unknown as
        | RootStackNavigationProp
        | undefined;
      rootNav?.navigate('ExportVersionModal', {
        versionType,
        versionId: selectedVersion.id,
        versionName: selectedVersion.name,
      });
    } finally {
      setIsExporting(false);
    }
  }, [selectedVersion, versionType, navigation, isExporting]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <ModalHeader
        title={t('versions.infoTitle')}
        showBack={true}
        onBack={handleBackToVersions}
        showClose={true}
        onClose={() => navigation.getParent()?.goBack()}
      />

      {/* Version Info Content */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.body}>
          {/* Header like Details.tsx (no image) */}
          <View style={styles.headerBlock}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={2}>
              {selectedVersion ? selectedVersion.name : t('versions.title')}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}>
              {selectedVersion?.languageName ||
                languageName ||
                t('versions.unknownLanguage')}
            </Text>
            {isSelectedSaved && (
              <View style={styles.headerActionsRow}>
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={onExport}>
                  <MaterialIcons
                    name='share'
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </View>
            )}
            {/* Regions removed from this screen; handled in LanguageInfoScreen */}
          </View>

          {/* Progress as circular indicators */}
          <View style={styles.statsRow}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size='small' color={theme.colors.primary} />
              </View>
            ) : (
              <>
                <RingStat
                  label={t('versions.ring.oldTestament')}
                  completed={ot.completed}
                  total={ot.total}
                  color={theme.colors.primary}
                  textColor={theme.colors.text}
                />
                <RingStat
                  label={t('versions.ring.newTestament')}
                  completed={nt.completed}
                  total={nt.total}
                  color={theme.colors.primary}
                  textColor={theme.colors.text}
                />
              </>
            )}
          </View>

          {/* Saved-only controls */}
          {isSelectedSaved && (
            <View style={styles.section}>
              {/* Download switch card (audio only) */}
              {versionType === 'audio' && (
                <View
                  style={[
                    styles.switchCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}>
                  <View style={styles.switchCardInfo}>
                    <Text
                      style={[
                        styles.switchCardTitle,
                        { color: theme.colors.text },
                      ]}>
                      {t('versions.download.version')}
                    </Text>
                    <Text
                      style={[
                        styles.switchCardSub,
                        { color: theme.colors.textSecondary },
                      ]}>
                      {totalFiles > 0
                        ? t('versions.download.progress', {
                            downloaded: downloadedFiles,
                            total: totalFiles,
                          })
                        : t('versions.download.noAudioFiles')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (isDownloadEnabled && downloadedFiles > 0) {
                        onPressDownload();
                      } else {
                        onPressDownload();
                      }
                    }}
                    style={[
                      styles.switchPill,
                      {
                        backgroundColor: isDownloadEnabled
                          ? theme.colors.primary
                          : theme.colors.interactiveDisabled,
                      },
                    ]}>
                    <View
                      style={[
                        styles.knob,
                        isDownloadEnabled ? styles.knobRight : styles.knobLeft,
                        { backgroundColor: theme.colors.textInverse },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Version list removed; handled in LanguageInfoScreen */}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.colors.modalBackground,
            borderTopColor: theme.colors.border,
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.footerButton,
            {
              backgroundColor:
                selectedVersion && !isDownloadingText
                  ? theme.colors.primary
                  : theme.colors.interactiveDisabled,
            },
          ]}
          onPress={onFooterPress}
          disabled={!selectedVersion || isDownloadingText}>
          {isDownloadingText ? (
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator
                size='small'
                color={theme.colors.textInverse}
                style={styles.buttonSpinner}
              />
              <Text
                style={[
                  styles.footerButtonText,
                  { color: theme.colors.textInverse },
                ]}>
                {footerCtaLabel}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.footerButtonText,
                { color: theme.colors.textInverse },
              ]}>
              {footerCtaLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* No Internet Modal */}
      <NoInternetModal
        visible={showNoInternetModal && !isOnline}
        onRetry={handleRetryConnection}
        onClose={() => setShowNoInternetModal(false)}
      />
    </View>
  );
};

const RingStat: React.FC<{
  label: string;
  completed: number;
  total: number;
  color: string;
  textColor: string;
}> = ({ label, completed, total, color, textColor }) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 40;
  const stroke = 8;
  const size = (radius + stroke) * 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  const gap = circumference - dash;

  return (
    <View style={styles.statContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color + '26'}
          strokeWidth={stroke}
          fill='none'
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap='butt'
          fill='none'
          rotation='-90'
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={styles.statCenterOverlayRing}>
        <Text style={[styles.statPercent, { color: textColor }]}>
          {percent}%
        </Text>
      </View>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.statSub, { color: textColor }]}>
        {completed}/{total}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 100,
  },
  headerBlock: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Share layout matches Details.tsx action button sizing
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  headerActionButton: {
    padding: 8,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  section: {
    marginTop: 20,
  },

  statContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  statPercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 8,
    fontSize: 12,
  },
  statSub: {
    marginTop: 2,
    fontSize: 12,
  },
  statCenterOverlayRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  switchCardInfo: {
    flex: 1,
    paddingRight: 12,
  },
  switchCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchCardSub: {
    fontSize: 13,
  },
  switchPill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  knobLeft: {
    alignSelf: 'flex-start',
  },
  knobRight: {
    alignSelf: 'flex-end',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSpinner: {
    marginRight: 4,
  },
});

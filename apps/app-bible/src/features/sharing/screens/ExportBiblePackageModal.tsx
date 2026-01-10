import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import type {
  AudioVersion,
  TextVersion,
} from '@/features/languages/types/entities';
import { usePackageEstimate } from '../hooks/usePackageEstimate';
import { PackagingService } from '../services/PackagingService';
import { useSharing } from '../hooks/useSharing';
import type { AudioPackageScope, TextPackageScope } from '../types';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

type TabType = 'audio' | 'text';

interface VersionItemProps {
  version: AudioVersion | TextVersion;
  isSelected: boolean;
  onSelect: () => void;
  versionType: 'audio' | 'text';
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isSelected,
  onSelect,
  versionType,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const scope = useMemo(() => ({ mode: 'full' as const }), []);
  const { estimate, loading } = usePackageEstimate(
    versionType,
    version.id,
    scope
  );

  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    const mb = Math.round(bytes / (1024 * 1024));
    return mb > 0 ? t('common.megabytes', { mb }) : t('common.lessThanOneMB');
  };

  return (
    <Pressable
      style={[
        styles.versionItem,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
        isSelected && styles.versionItemSelected,
      ]}
      onPress={onSelect}>
      <View style={styles.versionInfo}>
        <Text style={[styles.versionName, { color: theme.colors.text }]}>
          {version.name}
        </Text>
        <Text
          style={[
            styles.versionLanguage,
            { color: theme.colors.textSecondary },
          ]}>
          {version.languageName || t('versions.unknownLanguage')}
        </Text>
      </View>

      <View style={styles.versionMeta}>
        {loading ? (
          <ActivityIndicator size='small' color={theme.colors.textSecondary} />
        ) : estimate ? (
          <>
            <Text
              style={[styles.sizeText, { color: theme.colors.textSecondary }]}>
              {formatSize(estimate.totalBytes)}
            </Text>
            {estimate.partCount > 1 && (
              <Text
                style={[
                  styles.partsText,
                  { color: theme.colors.textSecondary },
                ]}>
                {t('sharing.parts', { count: estimate.partCount })}
              </Text>
            )}
          </>
        ) : null}
      </View>
    </Pressable>
  );
};

export const ExportBiblePackageModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { savedAudioVersions, savedTextVersions } = useVersionsStore();

  const [activeTab, setActiveTab] = useState<TabType>('audio');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  const { shareFile } = useSharing();

  const scope = useMemo(() => ({ mode: 'full' as const }), []);

  const currentVersions =
    activeTab === 'audio' ? savedAudioVersions : savedTextVersions;
  const selectedVersion = currentVersions.find(v => v.id === selectedVersionId);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.getParent()?.goBack();
    }
  }, [navigation]);

  const handleExport = useCallback(async () => {
    if (!selectedVersionId || !selectedVersion) return;

    setIsExporting(true);
    setExportProgress(t('sharing.preparingExport'));

    try {
      if (activeTab === 'audio') {
        setExportProgress(t('sharing.creatingAudioPackage'));
        const { packageUris } = await PackagingService.createAudioPackage(
          selectedVersionId,
          scope as AudioPackageScope
        );

        if (packageUris.length === 0) {
          setExportProgress(t('sharing.noFilesToExport'));
          return;
        }

        setExportProgress(t('sharing.openingShareSheet'));
        for (const uri of packageUris) {
          await shareFile(uri);
        }
      } else {
        setExportProgress(t('sharing.creatingTextPackage'));
        const { packageUris } = await PackagingService.createTextPackage(
          selectedVersionId,
          scope as TextPackageScope
        );

        if (packageUris.length === 0) {
          setExportProgress(t('sharing.noTextToExport'));
          return;
        }

        setExportProgress(t('sharing.openingShareSheet'));
        for (const uri of packageUris) {
          await shareFile(uri);
        }
      }

      handleClose();
    } catch (error) {
      setExportProgress(t('sharing.exportFailed'));
      logger.error(ENABLE_LOGGING, 'Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  }, [
    selectedVersionId,
    selectedVersion,
    activeTab,
    scope,
    shareFile,
    handleClose,
    t,
  ]);

  const renderVersionItem = useCallback(
    ({ item }: { item: AudioVersion | TextVersion }) => (
      <VersionItem
        version={item}
        isSelected={item.id === selectedVersionId}
        onSelect={() => setSelectedVersionId(item.id)}
        versionType={activeTab}
      />
    ),
    [selectedVersionId, activeTab]
  );

  const itemSeparator = useCallback(
    () => (
      <View
        style={[styles.separator, { borderBottomColor: theme.colors.border }]}
      />
    ),
    [theme.colors.border]
  );

  const tabContainerBg = useMemo(
    () =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    [theme.mode]
  );

  const canExport = Boolean(selectedVersionId) && !isExporting;

  return (
    <>
      {/* Header - Fixed header for FormSheet compliance */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.modalBackground,
            paddingBottom: Math.max(insets.bottom, 0),
            borderBottomColor: theme.colors.border,
          },
        ]}
        collapsable={false}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('nav.exportBiblePackage')}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name='close'
              size={24}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {t('sharing.exportDescription')}
        </Text>

        {/* Tabs */}
        <View
          style={[styles.tabContainer, { backgroundColor: tabContainerBg }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'audio' && [
                styles.tabActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => {
              setActiveTab('audio');
              setSelectedVersionId(null);
            }}>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'audio'
                      ? theme.colors.background
                      : theme.colors.textSecondary,
                },
              ]}>
              {t('common.audio')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'text' && [
                styles.tabActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => {
              setActiveTab('text');
              setSelectedVersionId(null);
            }}>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'text'
                      ? theme.colors.background
                      : theme.colors.textSecondary,
                },
              ]}>
              {t('common.text')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Scrollable Content - Single child for FormSheet compliance */}
      {currentVersions.length === 0 ? (
        <View
          style={[
            styles.emptyContainer,
            { backgroundColor: theme.colors.modalBackground },
          ]}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('sharing.noSavedVersions', { versionType: activeTab })}
          </Text>
        </View>
      ) : (
        <FlatList
          style={[
            styles.list,
            { backgroundColor: theme.colors.modalBackground },
          ]}
          data={currentVersions}
          keyExtractor={(item: AudioVersion | TextVersion) => item.id}
          renderItem={renderVersionItem}
          ItemSeparatorComponent={itemSeparator}
          ListHeaderComponent={<View style={styles.listHeader} />}
          ListFooterComponent={
            selectedVersionId ? (
              <View style={styles.listFooter}>
                {/* Progress indicator when exporting */}
                {isExporting && exportProgress && (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator
                      size='small'
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.progressText,
                        { color: theme.colors.primary },
                      ]}>
                      {exportProgress}
                    </Text>
                  </View>
                )}

                {/* Export Button - only show when version is selected */}
                <View style={styles.footer}>
                  <Pressable
                    style={[
                      styles.exportButton,
                      {
                        backgroundColor: canExport
                          ? theme.colors.primary
                          : theme.colors.interactiveDisabled,
                      },
                    ]}
                    onPress={handleExport}
                    disabled={!canExport}>
                    <Text
                      style={[
                        styles.exportButtonText,
                        { color: theme.colors.textInverse },
                      ]}>
                      {isExporting
                        ? t('sharing.exporting')
                        : t('sharing.export')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyFooter} />
            )
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    // backgroundColor set dynamically
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listHeader: {
    height: 8,
  },
  listFooter: {
    paddingTop: 16,
  },
  listContent: {
    paddingTop: 8,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  versionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  versionItemSelected: {
    borderWidth: 2,
  },
  versionInfo: {
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  versionLanguage: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  versionMeta: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  partsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  emptyFooter: {
    height: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
  },
  exportButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

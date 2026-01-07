import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { DownloadRowCard } from '../components/DownloadRowCard';
import { useDownloadsStore } from '@/shared/store/downloadsStore';
import { useUserVersions } from '@/features/languages/hooks/useUserVersions';
import { logger } from '@/shared/utils/logger';
import {
  useVersionDownloads,
  useDownloadManager,
  useDownloadStatus,
  type DownloadRow,
} from '../hooks';
import { useVersionDownloadActions } from '../components';

// Logging configuration for this module
const ENABLE_LOGGING = false;

type TabType = 'queue' | 'versions';

type SectionHeaderItem = {
  type: 'section';
  title: string;
  key: string;
};

type VersionItem = {
  type: 'downloaded' | 'not-downloaded';
  id: string;
  name: string;
  language_name: string;
  total_files: number;
  downloaded_files: number;
  is_downloading: boolean;
  download_enabled: boolean;
  has_downloaded_files: boolean;
};

type VersionsListItem = SectionHeaderItem | VersionItem;

export const DownloadStatusModal: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useLocalization();
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  // Use custom hooks for data management
  const { downloads } = useDownloadStatus();
  const { active, queued } = useDownloadsStore();
  const { savedAudioVersions } = useUserVersions();

  // Initialize download manager
  const { initialize } = useDownloadManager();

  // Memoize audioVersionIds to prevent infinite re-renders
  const audioVersionIds = useMemo(
    () => savedAudioVersions.map(v => v.id),
    [savedAudioVersions]
  );

  // Use new version downloads hook for batch status
  const {
    statusMap: versionStatusMap,
    toggleDownload: toggleVersionDownload,
    isLoading: versionsLoading,
  } = useVersionDownloads({
    versionIds: audioVersionIds,
    enabled: audioVersionIds.length > 0,
    realtime: true,
  });

  // Use version download actions hook
  const { handleRemoveDownloadedVersion, handleDownloadVersion } =
    useVersionDownloadActions({
      onToggleDownload: async (versionId: string) => {
        await toggleVersionDownload(versionId);
      },
    });

  // Convert to legacy format for compatibility and split into downloaded/not downloaded
  const audioVersions = savedAudioVersions.map(version => {
    const status = versionStatusMap[version.id];
    return {
      id: version.id,
      name: version.name,
      language_name: version.languageName,
      total_files: status?.totalFiles ?? 0,
      downloaded_files: status?.downloadedFiles ?? 0,
      is_downloading: status?.isActivelyDownloading ?? false,
      download_enabled: status?.isDownloadEnabled ?? false,
      has_downloaded_files: (status?.downloadedFiles ?? 0) > 0,
    };
  });

  // Split versions based on download_enabled status (whether in user_saved_audio_versions_downloads)
  const downloadedVersions = audioVersions.filter(v => v.download_enabled);
  const notDownloadedVersions = audioVersions.filter(v => !v.download_enabled);

  const handleClose = useCallback(() => {
    // For formSheet modals, we want to ensure proper dismissal
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback for edge cases where goBack might not work
      navigation.getParent()?.goBack();
    }
  }, [navigation]);

  // Initialize download manager on mount (simplified)
  React.useEffect(() => {
    initialize().catch(error => {
      logger.warn(
        ENABLE_LOGGING,
        'Download manager initialization failed:',
        error
      );
    });
  }, [initialize]);

  const renderDownloadRow = useCallback(
    ({ item }: { item: DownloadRow }) => (
      <DownloadRowCard
        chapterRef={item.chapter_ref}
        status={item.status}
        progress={item.progress}
        versionName={item.version_name}
      />
    ),
    []
  );

  // Helper functions for dynamic colors
  const tabContainerBg = useMemo(
    () =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    [theme.mode]
  );

  const renderDownloadedVersionRow = useCallback(
    ({ item }: { item: (typeof audioVersions)[0] }) => (
      <View
        style={[styles.versionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.versionInfo}>
          <Text style={[styles.versionName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.versionLanguage,
              { color: theme.colors.textSecondary },
            ]}>
            {item.language_name}
          </Text>
          <Text
            style={[
              styles.versionStatus,
              { color: theme.colors.textSecondary },
            ]}>
            {item.total_files > 0
              ? t('downloads.statusDownloadedCount', {
                  downloaded: item.downloaded_files,
                  total: item.total_files,
                })
              : t('downloads.noAudioAvailable')}
            {item.is_downloading && t('downloads.downloadingBullet')}
          </Text>
        </View>
        <Pressable
          style={styles.actionButtonContainer}
          onPress={() => handleRemoveDownloadedVersion(item)}
          disabled={versionsLoading}>
          <Ionicons name='trash-outline' size={20} color='#dc3545' />
        </Pressable>
      </View>
    ),
    [theme.colors, versionsLoading, handleRemoveDownloadedVersion, t]
  );

  const renderNotDownloadedVersionRow = useCallback(
    ({ item }: { item: (typeof audioVersions)[0] }) => (
      <View
        style={[styles.versionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.versionInfo}>
          <Text style={[styles.versionName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text
            style={[
              styles.versionLanguage,
              { color: theme.colors.textSecondary },
            ]}>
            {item.language_name}
          </Text>
          <Text
            style={[
              styles.versionStatus,
              { color: theme.colors.textSecondary },
            ]}>
            {item.total_files > 0
              ? t('downloads.audioFilesAvailable', { total: item.total_files })
              : t('downloads.noAudioAvailable')}
            {item.is_downloading && t('downloads.downloadingBullet')}
          </Text>
        </View>
        <Pressable
          style={styles.actionButtonContainer}
          onPress={() => handleDownloadVersion(item)}
          disabled={versionsLoading}>
          <Ionicons
            name='download-outline'
            size={20}
            color={theme.colors.primary}
          />
        </Pressable>
      </View>
    ),
    [theme.colors, versionsLoading, handleDownloadVersion, t]
  );

  const itemSeparator = useCallback(
    () => (
      <View
        style={[styles.separator, { borderBottomColor: theme.colors.border }]}
      />
    ),
    [theme.colors.border]
  );

  return (
    <>
      {/* Header - Fixed header outside of FlatList for FormSheet compliance */}
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
            {t('nav.downloads')}
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

        {/* Tabs */}
        <View
          style={[styles.tabContainer, { backgroundColor: tabContainerBg }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'queue' && [
                styles.tabActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('queue')}>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'queue'
                      ? theme.colors.background
                      : theme.colors.textSecondary,
                },
              ]}>
              {t('bible.queue')}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'versions' && [
                styles.tabActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('versions')}>
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'versions'
                      ? theme.colors.background
                      : theme.colors.textSecondary,
                },
              ]}>
              {t('downloads.title')}
            </Text>
          </Pressable>
        </View>

        {/* Dynamic subtitle based on active tab */}
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {activeTab === 'queue'
            ? `${active} active • ${queued} queued`
            : `${audioVersions.length} of ${savedAudioVersions.length} saved versions`}
        </Text>
      </View>

      {/* ScrollView content - This is the only child that matters for FormSheet */}
      {activeTab === 'queue' ? (
        <FlatList
          style={[
            styles.list,
            { backgroundColor: theme.colors.modalBackground },
          ]}
          data={downloads}
          keyExtractor={(item: DownloadRow) => item.id}
          renderItem={renderDownloadRow}
          ItemSeparatorComponent={itemSeparator}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          keyboardShouldPersistTaps='handled'
          initialNumToRender={15}
          windowSize={3}
          maxToRenderPerBatch={10}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          style={[
            styles.list,
            { backgroundColor: theme.colors.modalBackground },
          ]}
          data={
            [
              // Add section data for downloaded versions
              ...(downloadedVersions.length > 0
                ? [
                    {
                      type: 'section' as const,
                      title: t('downloads.sectionDownloadedVersions'),
                      key: 'downloaded-header',
                    },
                    ...downloadedVersions.map(v => ({
                      type: 'downloaded' as const,
                      ...v,
                    })),
                  ]
                : []),
              // Add section data for not downloaded versions
              ...(notDownloadedVersions.length > 0
                ? [
                    {
                      type: 'section' as const,
                      title: t('downloads.sectionAvailableForDownload'),
                      key: 'available-header',
                    },
                    ...notDownloadedVersions.map(v => ({
                      type: 'not-downloaded' as const,
                      ...v,
                    })),
                  ]
                : []),
            ] as VersionsListItem[]
          }
          keyExtractor={(item: VersionsListItem) =>
            item.type === 'section' ? item.key : item.id
          }
          renderItem={({ item }: { item: VersionsListItem }) => {
            if (item.type === 'section') {
              return (
                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {item.title}
                  </Text>
                </View>
              );
            } else if (item.type === 'downloaded') {
              return renderDownloadedVersionRow({ item });
            } else if (item.type === 'not-downloaded') {
              return renderNotDownloadedVersionRow({ item });
            }
            return null;
          }}
          ItemSeparatorComponent={itemSeparator}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}>
                {savedAudioVersions.length > 0
                  ? t('downloads.loadingAudioVersions')
                  : t('downloads.noSavedAudioVersions')}
              </Text>
            </View>
          )}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    borderRadius: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  // Version card styles
  versionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
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
  versionStatus: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 16,
  },
  // Action button styles
  actionButtonContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section header styles
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

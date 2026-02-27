import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import {
  Header,
  Details,
  GradientBackground,
} from '@everylanguage/shared-native-ui';
import { useChaptersWithMetadata } from '../hooks/useChaptersWithMetadata';
import { useAudioAvailabilityInvalidation } from '../hooks';
import { ChapterCard } from '../components/ChapterCard';
import { ChapterCardSkeleton } from '../components/ChapterCardSkeleton';
import { getBookImageByNumber } from '../assets/bookArtRegistry';
import { useBibleNavigationV2 } from '../services/BibleNavigationServiceV2';
import { useBibleNavigationStore } from '../store/bibleNavigationStore';

import {
  useCurrentTrack,
  usePlaybackState,
  usePlaybackActions,
} from '@/features/media/store/PlaybackStore';
import { useQueueStore } from '@/features/media/store/QueueStore';
import { playChapterWithAutoOpen } from '@/features/media/utils/autoOpenHelper';
import type { ChapterWithMetadata } from '../types';
import type { ChapterMediaOptions } from '@/features/media/types';

import { logger } from '@/shared/utils/logger';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import { useCurrentVersions } from '@/features/languages/hooks';
import { useShare } from '@/features/sharing/hooks/useShare';
import type { MenuAction } from '@react-native-menu/menu';
import { useMediaBottomInset } from '@/features/media/layout/useMediaBottomInset';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useResolvedBibleLocation } from '../hooks/useResolvedBibleLocation';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { DeepLinkState } from '@/shared/services/deeplink/DeepLinkState';
import {
  getBookMenuActions,
  handleBookMenuAction,
} from '@/features/bible/utils/bookMenu';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { powerSyncConnectionManager } from '@/shared/services/powersync/PowerSyncConnectionManager';
import { useBookChapterDownloadMap } from '@/features/downloads/hooks';
import { queueManager } from '@/features/downloads/services/QueueManager';
import { downloadManager } from '@/features/downloads/services/DownloadManager';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import type { BibleStackParamList } from '../navigation/BibleStackNavigator';

export const BookChaptersScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const bottomInset = useMediaBottomInset();
  const { navigateToChapter, goBack } = useBibleNavigationV2();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteProp<BibleStackParamList, 'BibleChapters'>>();

  // Handler for opening add to playlist modal
  const handleOpenAddToPlaylist = (chapter: ChapterWithMetadata) => {
    const addParams = {
      chapterId: chapter.id,
      chapterNumber: chapter.chapter_number,
      bookId: chapter.book_id,
      ...(resolvedBook?.name ? { bookName: resolvedBook.name } : {}),
    };

    navigation.navigate('AddToPlaylistModal', addParams);
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      minHeight: 400,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      minHeight: 400,
    },
    errorText: { fontSize: 16, color: theme.colors.error, textAlign: 'center' },
    chaptersList: { paddingBottom: 16, paddingHorizontal: 16 },
    syncDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 20,
      lineHeight: 20,
    },
    syncButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    syncButtonText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  });

  // Get current navigation state from store
  const { selectedBook } = useBibleNavigationStore();

  // Params and resolution
  const incomingBook = selectedBook;
  const incomingBookId = incomingBook?.id ?? route.params?.bookId ?? null;
  const incomingChapterId = null; // No chapter ID for chapters screen

  const { resolvedBook } = useResolvedBibleLocation({
    incomingBook,
    incomingBookId,
    incomingChapterId,
    incomingVerseId: null,
  });

  // Hooks must be called before any early returns
  const { currentAudioVersion } = useVersionsStore();
  const { currentTextVersion } = useCurrentVersions();
  const { shareBook } = useShare();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlaybackState();
  // Use MediaPlayerService and PlaybackStore directly
  const { pause, clearError } = usePlaybackActions();
  const playChapter = useCallback(
    async (chapterId: string, options?: ChapterMediaOptions) => {
      await playChapterWithAutoOpen(chapterId, options, 'BookChaptersScreen');
    },
    []
  );
  const addToQueue = useQueueStore(state => state.addToQueue);

  // Always call chapters hook (empty id will yield no results), to keep hooks order stable
  const bookIdForQuery = resolvedBook?.id ?? '';
  const chaptersQuery = useChaptersWithMetadata(bookIdForQuery);

  // Invalidate chapters metadata reactively as media_files for current audio version change
  useAudioAvailabilityInvalidation(currentAudioVersion?.id ?? null);

  // Note: Auto-start removed - users should choose what to play

  // 🚀 PRE-WARM: Pre-warm cache for first few chapters when book loads (lightweight)
  useEffect(() => {
    if (!resolvedBook || chaptersQuery.loading || !currentAudioVersion?.id) {
      return;
    }

    // Pre-warm cache in background (non-blocking, lightweight)
    const preWarmCache = async () => {
      try {
        const { chapterMediaResolver } =
          await import('@/features/media/services/ChapterMediaResolver');
        // Only pre-warm first 2 chapters to be less aggressive
        await chapterMediaResolver.preWarmBookCache(
          resolvedBook.id,
          currentAudioVersion.id,
          2
        );
      } catch (error) {
        logger.warn(ENABLE_LOGGING, 'Pre-warming failed:', error);
      }
    };

    // Start pre-warming after a longer delay since we're not auto-starting
    const timeoutId = setTimeout(preWarmCache, 2000);
    return () => clearTimeout(timeoutId);
  }, [resolvedBook, currentAudioVersion?.id, chaptersQuery.loading]);

  // Per-chapter availability map for current book/audio version
  const chapterDlMap = useBookChapterDownloadMap(
    resolvedBook?.id ?? null,
    currentAudioVersion?.id ?? null
  );

  // Handle audio deep links for books: play first available chapter or alert
  useEffect(() => {
    const info = DeepLinkState.get();
    if (!info || info.shareType !== 'audio') return;
    if (info.type !== 'book') return;
    if (!resolvedBook) return;
    if (info.entityId !== resolvedBook.id) return;
    if (chaptersQuery.loading) return; // wait for chapters
    const run = async () => {
      try {
        // Ensure media store/services are initialized before attempting playback
        try {
          const { getPlaybackStore } =
            await import('@/features/media/store/PlaybackStore');
          await getPlaybackStore().initialize();
        } catch (e) {
          logger.warn(
            ENABLE_LOGGING,
            '[DeepLink] Media store initialize failed (continuing)',
            e
          );
        }

        const firstWithAudio = chaptersQuery.chapters.find(
          c => c.hasMediaFiles
        );
        if (firstWithAudio) {
          const opts: Parameters<typeof playChapter>[1] = {
            preferOffline: true,
          };
          if (currentAudioVersion?.id)
            opts.audioVersionId = currentAudioVersion.id;
          if (currentTextVersion?.id)
            opts.textVersionId = currentTextVersion.id;
          await playChapter(firstWithAudio.id, opts);
        } else {
          Alert.alert(t('audio.unavailableTitle'), t('audio.unavailableBook'));
        }
      } finally {
        DeepLinkState.clear();
      }
    };

    run().catch(e =>
      logger.error(ENABLE_LOGGING, '[DeepLink] book audio handling failed', e)
    );
  }, [
    resolvedBook,
    chaptersQuery.loading,
    chaptersQuery.chapters,
    playChapter,
    currentAudioVersion?.id,
    currentTextVersion?.id,
    t,
  ]);

  if (!resolvedBook) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <MaterialIcons
            name='hourglass-empty'
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.loadingText}>{t('chapters.loading')}</Text>
        </View>
      </GradientBackground>
    );
  }

  const { chapters, loading, error, isRefetching, fetchChapters } =
    chaptersQuery;

  const handleRetrySync = async () => {
    try {
      // Ensure seed is complete (no-op if already seeded)
      await powerSyncSystem.waitUntilSeeded();
    } catch {
      // non-fatal
    }
    try {
      // Fire-and-forget connection attempt if not already connected
      powerSyncConnectionManager.attemptConnection().catch(() => {});
    } catch {
      // non-fatal
    }
    try {
      await fetchChapters();
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    const shareOptions: Parameters<typeof shareBook>[1] = {
      title: resolvedBook.name || 'Bible Book',
      customText: `Check out ${resolvedBook.name || 'this Bible book'} in EveryLanguage Bible!`,
    };
    if (currentAudioVersion?.id)
      shareOptions.audioVersionId = currentAudioVersion.id;
    if (currentTextVersion?.id)
      shareOptions.textVersionId = currentTextVersion.id;
    await shareBook(resolvedBook.id, shareOptions);
  };

  const menuActions: MenuAction[] = getBookMenuActions({
    hasMediaFiles: chapters.some(c => c.hasMediaFiles),
    withIcons: true,
    includeShareText: true,
    includeShareAudio: true,
  });
  const handleMenuAction = async ({
    nativeEvent,
  }: {
    nativeEvent: { event: string };
  }) => {
    await handleBookMenuAction(nativeEvent.event, {
      bookId: resolvedBook.id,
      bookName: resolvedBook.name,
      shareBook,
      ...(currentAudioVersion?.id
        ? { currentAudioVersionId: currentAudioVersion.id }
        : {}),
      ...(currentTextVersion?.id
        ? { currentTextVersionId: currentTextVersion.id }
        : {}),
    });
  };

  const handlePlayPress = async () => {
    const firstChapterWithMedia = chapters.find(c => c.hasMediaFiles);
    if (!firstChapterWithMedia) return;
    await handlePlayChapter(firstChapterWithMedia);
  };

  const handleChapterPress = (chapter: ChapterWithMetadata) => {
    navigateToChapter(resolvedBook, chapter);
  };

  const handlePlayChapter = async (chapter: ChapterWithMetadata) => {
    const isCurrent = currentTrack?.chapterId === chapter.id;
    if (isCurrent && isPlaying) {
      await pause();
      return;
    }
    try {
      clearError();
      const opts: Parameters<typeof playChapter>[1] = { preferOffline: true };
      if (currentAudioVersion?.id) opts.audioVersionId = currentAudioVersion.id;
      if (currentTextVersion?.id) opts.textVersionId = currentTextVersion.id;
      await playChapter(chapter.id, opts);
    } catch (e) {
      logger.error(ENABLE_LOGGING, 'Error playing chapter:', e);
    }
  };

  const handleQueueChapter = async (chapter: ChapterWithMetadata) => {
    if (!chapter.hasMediaFiles) return;
    try {
      const opts: Parameters<typeof addToQueue>[1] = { preferOffline: true };
      if (currentAudioVersion?.id) opts.audioVersionId = currentAudioVersion.id;
      if (currentTextVersion?.id) opts.textVersionId = currentTextVersion.id;
      await addToQueue(chapter.id, opts);
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'Error adding chapter to queue from BookChaptersScreen:',
        e
      );
    }
  };

  const handleAvailabilityPress = async (chapter: ChapterWithMetadata) => {
    try {
      await queueManager.prioritizeChapterDownloads(chapter.id);
      await downloadManager.kick();
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Failed to prioritize chapter download', e);
    }
  };

  const renderChapterCard = ({ item }: { item: ChapterWithMetadata }) => {
    const props: React.ComponentProps<typeof ChapterCard> = {
      chapter: item,
      onPress: handleChapterPress,
      onQueue: handleQueueChapter,
      onPlay: handlePlayChapter,
      openAddToPlaylist: handleOpenAddToPlaylist,
      bookName: resolvedBook.name,
      onPressAvailability: handleAvailabilityPress,
      navigation,
    };
    if (currentAudioVersion?.id)
      props.currentAudioVersionId = currentAudioVersion.id;
    if (currentTextVersion?.id)
      props.currentTextVersionId = currentTextVersion.id;

    // Map aggregate to availability state
    const agg = chapterDlMap[item.id];
    if (item.hasMediaFiles && agg) {
      let state: 'streaming' | 'downloading' | 'downloaded' = 'streaming';
      if (agg.totalFiles <= 0) state = 'streaming';
      else if (agg.downloadedFiles >= agg.totalFiles) state = 'downloaded';
      else if (
        agg.activeDownloads > 0 ||
        (agg.totalBytes > 0 && agg.downloadedBytes > 0)
      )
        state = 'downloading';
      const progress =
        agg.totalBytes > 0 ? agg.downloadedBytes / agg.totalBytes : 0;
      props.availability = { state, progress };
    }
    return <ChapterCard {...props} />;
  };

  const renderContent = () => {
    if (loading && chapters.length === 0) {
      const skeletonData = Array.from({ length: 6 }).map((_, i) => ({
        id: `skeleton-${i}`,
      }));
      return (
        <FlatList
          data={skeletonData}
          renderItem={() => <ChapterCardSkeleton />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chaptersList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      );
    }

    const shouldShowSync =
      (error && chapters.length === 0) ||
      (!loading && !isRefetching && chapters.length === 0);
    if (shouldShowSync) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons
            name='cloud-download'
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.errorText}>
            {error || t('chapters.emptyForBook')}
          </Text>
          <Text
            style={[
              styles.syncDescription,
              { color: theme.colors.textSecondary },
            ]}>
            {t('chapters.downloadPrompt')}
          </Text>
          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleRetrySync}>
            <Text
              style={[
                styles.syncButtonText,
                { color: theme.colors.textInverse },
              ]}>
              {t('chapters.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={chapters}
        renderItem={renderChapterCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.chaptersList}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    );
  };

  const totalChapters = chapters.length;
  const chaptersWithMedia = chapters.filter(c => c.hasMediaFiles).length;
  const subtitle =
    chaptersWithMedia > 0
      ? `${totalChapters} chapters • ${chaptersWithMedia} with audio`
      : `${totalChapters} chapters`;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Header
          onBackPress={goBack}
          title={resolvedBook.name || 'Unknown Book'}
          testID='chapter-screen-header'
          transparent={true}
        />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: bottomInset }}>
          <Details
            title={resolvedBook.name || 'Unknown Book'}
            subtitle={subtitle}
            albumArt={
              getBookImageByNumber(resolvedBook.book_number) || undefined
            }
            onSharePress={handleShare}
            playButtonProps={
              chaptersWithMedia > 0
                ? {
                    type: 'chapter',
                    id: `book-${resolvedBook.id}`,
                    onPress: handlePlayPress,
                  }
                : undefined
            }
            menuActions={menuActions}
            onMenuAction={handleMenuAction}
            testID='chapter-screen-details'
          />

          {renderContent()}
          <View style={{ height: bottomInset }} />
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

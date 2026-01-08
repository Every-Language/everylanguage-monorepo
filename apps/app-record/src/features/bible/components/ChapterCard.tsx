import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { PlayButton } from '@/shared/components';
import type { ChapterWithMetadata } from '../types';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import { useShare } from '@/features/sharing/hooks/useShare';
import {
  getChapterMenuActions,
  handleChapterMenuAction,
} from '@/features/bible/utils/chapterMenu';
import { RootStackNavigationProp } from '@/app/navigation';
// import { MediaAvailabilityStatus } from '@/shared/services/database/LocalDataService';

interface ChapterCardProps {
  chapter: ChapterWithMetadata;
  onPress: (chapter: ChapterWithMetadata) => void;
  onQueue?: (chapter: ChapterWithMetadata) => void;
  onPlay?: (chapter: ChapterWithMetadata) => void;
  /** Book name to display alongside chapter number (e.g., Genesis 1) */
  bookName?: string;
  /** Current audio version ID for sharing */
  currentAudioVersionId?: string;
  /** Current text version ID for sharing */
  currentTextVersionId?: string;
  /** Availability indicator for download/stream status */
  availability?: {
    state: 'streaming' | 'downloading' | 'downloaded';
    progress?: number; // 0..1
  };
  /** Tap handler for availability icon (prioritize download) */
  onPressAvailability?: (chapter: ChapterWithMetadata) => void;
  /** Handler to open add to playlist flow */
  openAddToPlaylist?: (chapter: ChapterWithMetadata) => void;
  /** Navigation function for opening modals */
  navigation?: RootStackNavigationProp;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  onPress,
  onQueue,
  onPlay,
  bookName,
  currentAudioVersionId,
  currentTextVersionId,
  availability,
  onPressAvailability,
  openAddToPlaylist,
  navigation,
}) => {
  const { theme } = useTheme();
  const { shareChapter } = useShare();
  // Menu handled by native popup; no manual positioning needed

  const formatVerseCount = (count: number) => {
    return count === 1 ? '1 verse' : `${count} verses`;
  };

  const styles = StyleSheet.create({
    chapterCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
    },
    chapterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chapterMainContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chapterInfo: {
      flex: 1,
    },
    chapterTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    verseCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    chapterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
    },
    availabilityIcon: {
      padding: 6,
      borderRadius: 8,
    },
    // removed custom menu styles
  });

  const handlePlayPress = () => {
    if (onPlay) {
      onPlay(chapter);
    }
  };

  const handleLongPress = () => {};

  const handleOpenAddToPlaylist = () => {
    navigation?.navigate('AddToPlaylistModal', {
      chapterId: chapter.id,
      bookId: chapter.book_id,
      chapterNumber: chapter.chapter_number,
      bookName: bookName ?? '',
    });
  };

  const onMenuAction = async ({
    nativeEvent,
  }: {
    nativeEvent: { event: string };
  }) => {
    const params = {
      chapter,
      shareChapter,
      addToQueue: async (
        chapterId: string,
        options?: {
          audioVersionId?: string;
          textVersionId?: string;
          preferOffline?: boolean;
        }
      ) => {
        if (onQueue) {
          onQueue(chapter);
          return;
        }
        const { getQueueStore } =
          await import('@/features/media/store/QueueStore');
        const { addToQueue } = getQueueStore();
        await addToQueue(chapterId, options);
      },
      ...(openAddToPlaylist
        ? {
            openAddToPlaylist: handleOpenAddToPlaylist,
          }
        : {}),
      ...(bookName ? { bookName } : {}),
      ...(currentAudioVersionId ? { currentAudioVersionId } : {}),
      ...(currentTextVersionId ? { currentTextVersionId } : {}),
    } as const;

    await handleChapterMenuAction(
      nativeEvent.event,
      params as unknown as {
        chapter: typeof chapter;
        bookName?: string;
        currentAudioVersionId?: string;
        currentTextVersionId?: string;
        shareChapter: typeof shareChapter;
        addToQueue: (
          chapterId: string,
          options?: {
            audioVersionId?: string;
            textVersionId?: string;
            preferOffline?: boolean;
          }
        ) => Promise<void>;
        openAddToPlaylist?: () => void;
      }
    );
  };

  // Sharing is handled by onMenuAction via handleChapterMenuAction

  const menuActions: MenuAction[] = getChapterMenuActions(
    chapter.hasMediaFiles,
    true,
    true, // include audio share
    true, // include share text
    true, // includeQueue
    true, // includeDownloadActions
    true, // includePlaylistActions
    availability?.state
  );

  const cardStyle = [
    styles.chapterCard,
    // Chapters are always selectable for reading, even without media files
  ];

  // Removed download/cloud availability UI

  return (
    <View style={cardStyle}>
      <View style={styles.chapterContent}>
        <TouchableOpacity
          style={styles.chapterMainContent}
          onPress={() => onPress(chapter)}
          onLongPress={handleLongPress}
          disabled={false}>
          <View style={styles.chapterInfo}>
            <Text style={styles.chapterTitle}>
              {bookName
                ? `${bookName} ${chapter.chapter_number}`
                : `Chapter ${chapter.chapter_number}`}
            </Text>
            <Text style={styles.verseCount}>
              {formatVerseCount(chapter.total_verses)}
            </Text>
          </View>
          {/* Availability indicators removed */}
        </TouchableOpacity>

        <View style={styles.chapterActions}>
          {/* Availability indicator (left of play button) */}
          {chapter.hasMediaFiles && availability && (
            <TouchableOpacity
              style={styles.availabilityIcon}
              onPress={() => onPressAvailability?.(chapter)}
              disabled={availability.state === 'downloaded'}>
              {availability.state === 'downloaded' ? (
                <MaterialIcons
                  name='download-done'
                  size={20}
                  color={theme.colors.primary}
                />
              ) : availability.state === 'downloading' ? (
                <ActivityIndicator size='small' color={theme.colors.primary} />
              ) : (
                <MaterialIcons
                  name='cloud-download'
                  size={20}
                  color={theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          )}
          <MenuView onPressAction={onMenuAction} actions={menuActions}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons
                name='more-vert'
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </MenuView>
          {onPlay && chapter.hasMediaFiles && (
            <PlayButton
              type='chapter'
              id={`${chapter.book_id}-${chapter.id}`}
              ignorePlayingState={true}
              onPress={handlePlayPress}
            />
          )}
        </View>
      </View>
    </View>
  );
};

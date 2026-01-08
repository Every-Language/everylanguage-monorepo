import { useCallback } from 'react';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import type { ChapterWithMetadata, BookWithMetadata } from '../types';
import type { MenuAction } from '@react-native-menu/menu';
import {
  buildChapterShareOptions,
  getChapterMenuActions,
  handleChapterMenuAction,
} from '../utils/chapterMenu';
import { useShare } from '@/features/sharing/hooks/useShare';
import { useQueueStore } from '@/features/media/store/QueueStore';

interface UseChapterMenuActionsParams {
  chapter: ChapterWithMetadata | null;
  book: BookWithMetadata | null;
  currentAudioVersionId?: string | undefined;
  currentTextVersionId?: string | undefined;
  downloadState?: 'streaming' | 'downloading' | 'downloaded' | 'unavailable';
  rootNavigation: RootStackNavigationProp;
}

export const useChapterMenuActions = ({
  chapter,
  book,
  currentAudioVersionId,
  currentTextVersionId,
  downloadState,
  rootNavigation,
}: UseChapterMenuActionsParams) => {
  const { shareChapter } = useShare();
  const addToQueue = useQueueStore(state => state.addToQueue);

  const handleOpenAddToPlaylist = useCallback(() => {
    if (!chapter) return;

    rootNavigation.navigate('AddToPlaylistModal', {
      chapterId: chapter.id,
      bookId: chapter.book_id,
      chapterNumber: chapter.chapter_number,
      bookName: book?.name ?? '',
    });
  }, [chapter, book?.name, rootNavigation]);

  const handleShare = useCallback(async () => {
    if (!chapter) return;
    const shareOptions = buildChapterShareOptions(
      chapter as ChapterWithMetadata,
      {
        bookName: book?.name ?? '',
        ...(currentAudioVersionId ? { currentAudioVersionId } : {}),
        ...(currentTextVersionId ? { currentTextVersionId } : {}),
      }
    );
    await shareChapter(chapter.id, shareOptions);
  }, [
    chapter,
    book?.name,
    currentAudioVersionId,
    currentTextVersionId,
    shareChapter,
  ]);

  const menuActions: MenuAction[] = getChapterMenuActions(
    (chapter?.hasMediaFiles as boolean) ?? true,
    true, // withIcons
    false, // includeAudioShare
    true, // includeShareText
    true, // includeQueue
    true, // includeDownloadActions
    true, // includePlaylistActions
    downloadState === 'unavailable' ? undefined : downloadState
  );

  const handleMenuAction = useCallback(
    async ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      if (!chapter) return;

      const params = {
        chapter,
        bookName: book?.name || 'Unknown Book',
        shareChapter,
        addToQueue: async (
          chapterId: string,
          options?: {
            audioVersionId?: string;
            textVersionId?: string;
            preferOffline?: boolean;
          }
        ) => {
          const queueOptions: Parameters<typeof addToQueue>[1] = {
            preferOffline: true,
            ...(options?.audioVersionId
              ? { audioVersionId: options.audioVersionId }
              : {}),
            ...(options?.textVersionId
              ? { textVersionId: options.textVersionId }
              : {}),
          };
          await addToQueue(chapterId, queueOptions);
        },
        openAddToPlaylist: async () => {
          handleOpenAddToPlaylist();
        },
        ...(currentAudioVersionId ? { currentAudioVersionId } : {}),
        ...(currentTextVersionId ? { currentTextVersionId } : {}),
      } as const;

      await handleChapterMenuAction(
        nativeEvent.event,
        params as unknown as {
          chapter: ChapterWithMetadata;
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
        }
      );
    },
    [
      chapter,
      book?.name,
      shareChapter,
      addToQueue,
      currentAudioVersionId,
      currentTextVersionId,
      handleOpenAddToPlaylist,
    ]
  );

  return {
    menuActions,
    handleMenuAction,
    handleShare,
  };
};

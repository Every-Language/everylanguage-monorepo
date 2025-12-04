import { useCallback } from 'react';
import type { ChapterWithMetadata } from '../types';
import type { ChapterMediaOptions } from '@/features/media/types';
import {
  useCurrentTrack,
  usePlaybackState,
  usePlaybackActions,
} from '@/features/media/store/PlaybackStore';
import { useQueueStore } from '@/features/media/store/QueueStore';
import { logger } from '@/shared/utils/logger';
import {
  playChapterWithAutoOpen,
  playChapterFromVerseWithAutoOpen,
} from '@/features/media/utils/autoOpenHelper';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const useChapterMediaActions = (chapter: ChapterWithMetadata | null) => {
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlaybackState();
  const { pause, clearError } = usePlaybackActions();
  const addToQueue = useQueueStore(state => state.addToQueue);

  // Use enhanced playChapter with auto-open logic
  const playChapter = useCallback(
    async (chapterId: string, options?: ChapterMediaOptions) => {
      await playChapterWithAutoOpen(
        chapterId,
        options,
        'useChapterMediaActions'
      );
    },
    []
  );

  const playChapterFromVerse = useCallback(
    async (
      chapterId: string,
      verseId: string,
      options?: ChapterMediaOptions
    ) => {
      await playChapterFromVerseWithAutoOpen(
        chapterId,
        verseId,
        options,
        'useChapterMediaActions'
      );
    },
    []
  );

  const handlePlayPress = useCallback(
    async (currentAudioVersionId?: string, currentTextVersionId?: string) => {
      if (!chapter || !chapter.hasMediaFiles) return;

      const isCurrent = currentTrack?.chapterId === chapter.id;
      if (isCurrent && isPlaying) {
        await pause();
        return;
      }

      try {
        clearError();
        const opts: Parameters<typeof playChapter>[1] = { preferOffline: true };
        if (currentAudioVersionId) opts.audioVersionId = currentAudioVersionId;
        if (currentTextVersionId) opts.textVersionId = currentTextVersionId;
        await playChapter(chapter.id, opts);
      } catch (e) {
        logger.error(ENABLE_LOGGING, 'Error playing chapter:', e);
      }
    },
    [
      chapter,
      currentTrack?.chapterId,
      isPlaying,
      pause,
      clearError,
      playChapter,
    ]
  );

  const handleAvailabilityPress = useCallback(async () => {
    if (!chapter) return;
    try {
      const { queueManager } = await import(
        '@/features/downloads/services/QueueManager'
      );
      const { downloadManager } = await import(
        '@/features/downloads/services/DownloadManager'
      );
      await queueManager.prioritizeChapterDownloads(chapter.id);
      await downloadManager.kick();
    } catch (e) {
      logger.warn(ENABLE_LOGGING, 'Failed to prioritize chapter download', e);
    }
  }, [chapter]);

  return {
    currentTrack,
    isPlaying,
    playChapter,
    playChapterFromVerse,
    handlePlayPress,
    handleAvailabilityPress,
    addToQueue,
  };
};

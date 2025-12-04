import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { ChapterWithMetadata } from '../types';
import type { ChapterMediaOptions } from '@/features/media/types';
import { DeepLinkState } from '@/shared/services/deeplink/DeepLinkState';
import { logger } from '@/shared/utils/logger';
import { useLocalization } from '@/shared/hooks';

// Logging configuration for this module
const ENABLE_LOGGING = true;

interface UseChapterDeepLinkHandlerParams {
  effectiveChapterId: string | null;
  chapter: ChapterWithMetadata | null;
  currentAudioVersionId?: string | undefined;
  currentTextVersionId?: string | undefined;
  playChapter: (
    chapterId: string,
    options?: ChapterMediaOptions
  ) => Promise<void>;
  playChapterFromVerse: (
    chapterId: string,
    verseId: string,
    options?: ChapterMediaOptions
  ) => Promise<void>;
  isStoreReady?: boolean;
}

export const useChapterDeepLinkHandler = ({
  effectiveChapterId,
  chapter,
  currentAudioVersionId,
  currentTextVersionId,
  playChapter,
  playChapterFromVerse,
  isStoreReady = true,
}: UseChapterDeepLinkHandlerParams) => {
  const { t } = useLocalization();
  const processedDeepLinksRef = useRef<Set<string>>(new Set());

  // React to deep-link updates while already on VersesScreen
  useEffect(() => {
    // Only process deep links when store is ready
    if (!isStoreReady) return;

    const info = DeepLinkState.get();
    if (!info || info.shareType !== 'audio') return;

    const isChapter = info.type === 'chapter';
    const isVerse = info.type === 'verse';
    if (!isChapter && !isVerse) return;

    const targetChapterId = effectiveChapterId ?? null;
    if (!targetChapterId) return; // wait for resolution

    // Deduplicate handling: avoid re-processing the same deep link
    const key = `${info.type}:${info.entityId}:${info.shareId ?? ''}`;
    if (processedDeepLinksRef.current.has(key)) return;
    processedDeepLinksRef.current.add(key);
    // Clear immediately to prevent concurrent handlers from seeing it again
    DeepLinkState.clear();

    const run = async () => {
      try {
        logger.info(
          ENABLE_LOGGING,
          '[DeepLink] Audio link detected on Verses screen',
          {
            entityType: info.type,
            entityId: info.entityId,
            chapterId: targetChapterId,
          }
        );

        // Ensure media store/services are initialized before attempting playback
        try {
          const { getPlaybackStore } = await import(
            '@/features/media/store/PlaybackStore'
          );
          await getPlaybackStore().initialize();
        } catch (e) {
          logger.warn(
            ENABLE_LOGGING,
            '[DeepLink] Media store initialize failed (continuing)',
            e
          );
        }

        if (!chapter || !chapter.hasMediaFiles) {
          Alert.alert(
            t('audio.unavailableTitle', { defaultValue: 'No Audio Available' }),
            t('audio.unavailableChapter', {
              defaultValue: 'This chapter has no audio available to play.',
            })
          );
          return;
        }

        const opts: Parameters<typeof playChapter>[1] = { preferOffline: true };
        if (currentAudioVersionId) opts.audioVersionId = currentAudioVersionId;
        if (currentTextVersionId) opts.textVersionId = currentTextVersionId;

        if (isVerse) {
          const verseId = info.entityId;
          try {
            logger.info(
              ENABLE_LOGGING,
              '[DeepLink] Calling playChapterFromVerse',
              {
                chapterId: targetChapterId,
                verseId,
              }
            );
            await playChapterFromVerse(targetChapterId, verseId, opts);
          } catch (err) {
            // Fallback to start of chapter if timings missing or error
            logger.warn(
              ENABLE_LOGGING,
              '[DeepLink] playChapterFromVerse failed, fallback to chapter',
              err
            );
            logger.info(
              ENABLE_LOGGING,
              '[DeepLink] Calling playChapter (fallback)',
              {
                chapterId: targetChapterId,
              }
            );
            await playChapter(targetChapterId, opts);
          }
        } else {
          logger.info(
            ENABLE_LOGGING,
            '[DeepLink] Calling playChapter for chapter',
            {
              chapterId: targetChapterId,
            }
          );
          await playChapter(targetChapterId, opts);
        }
      } finally {
        // no-op: already cleared before running
      }
    };

    run().catch(e =>
      logger.error(ENABLE_LOGGING, '[DeepLink] audio handling failed', e)
    );
  }, [
    isStoreReady,
    effectiveChapterId,
    chapter?.hasMediaFiles,
    chapter,
    currentAudioVersionId,
    currentTextVersionId,
    playChapter,
    playChapterFromVerse,
    t,
  ]);

  // Note: Navigation changes are now handled by the store-based navigation system
  // No need to manually navigate as the store will update the state automatically

  return {
    processedDeepLinks: processedDeepLinksRef.current,
  };
};

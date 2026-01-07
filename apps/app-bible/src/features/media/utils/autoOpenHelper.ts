import { logger } from '@/shared/utils/logger';
import type { ChapterMediaOptions } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Centralized helper to handle auto-open media player logic
 * This function checks the autoOpenOnPlay setting and requests expansion if needed
 *
 * @param context - Description of where this is being called from (for logging)
 */
export const requestAutoOpenIfEnabled = async (
  context: string
): Promise<void> => {
  try {
    // Dynamic import to avoid circular dependencies
    const { useMediaSettingsStore } = await import('@/features/settings');
    const settings = useMediaSettingsStore.getState();

    if (settings.autoOpenOnPlay) {
      logger.info(
        ENABLE_LOGGING,
        `[AutoOpen] 🎯 Requesting media player expansion from ${context}`
      );
      settings.requestExpandOnNextExternalPlay();
    } else {
      logger.debug(
        ENABLE_LOGGING,
        `[AutoOpen] ⏸️ Auto-open disabled, skipping expansion from ${context}`
      );
    }
  } catch (error) {
    // Non-fatal error - don't break playback if settings can't be accessed
    logger.warn(
      ENABLE_LOGGING,
      `[AutoOpen] ⚠️ Failed to check auto-open setting from ${context}:`,
      error
    );
  }
};

/**
 * Enhanced playChapter wrapper that includes auto-open logic
 * This should be used instead of calling MediaPlayerService directly
 *
 * @param chapterId - The chapter to play
 * @param options - Chapter media options
 * @param context - Where this is being called from (for logging)
 */
export const playChapterWithAutoOpen = async (
  chapterId: string,
  options: ChapterMediaOptions = {},
  context: string
): Promise<void> => {
  // Request auto-open before playing
  await requestAutoOpenIfEnabled(context);

  // Play the chapter
  const { mediaPlayerService } = await import('../services/MediaPlayerService');
  await mediaPlayerService.playChapter(chapterId, options);
};

/**
 * Enhanced playChapterFromVerse wrapper that includes auto-open logic
 * This should be used instead of calling MediaPlayerService directly
 *
 * @param chapterId - The chapter to play
 * @param verseId - The verse to start from
 * @param options - Chapter media options
 * @param context - Where this is being called from (for logging)
 */
export const playChapterFromVerseWithAutoOpen = async (
  chapterId: string,
  verseId: string,
  options: ChapterMediaOptions = {},
  context: string
): Promise<void> => {
  // Request auto-open before playing
  await requestAutoOpenIfEnabled(context);

  // Play the chapter from verse
  const { mediaPlayerService } = await import('../services/MediaPlayerService');
  await mediaPlayerService.playChapterAtVerse(chapterId, verseId, options);
};

/**
 * NEW: Auto-open expansion triggered by playback start events
 * This is called when audio actually starts playing
 */
export const triggerAutoOpenOnPlaybackStart = async (): Promise<void> => {
  try {
    const { useMediaSettingsStore } = await import('@/features/settings');
    const settings = useMediaSettingsStore.getState();

    if (settings.expandOnNextExternalPlay) {
      logger.info(
        ENABLE_LOGGING,
        `[AutoOpen] 🎵 Audio started playing - triggering expansion`
      );

      // Small delay to ensure smooth transition
      setTimeout(() => {
        settings.consumeExpandOnNextExternalPlay();
      }, 200);
    }
  } catch (error) {
    logger.warn(
      ENABLE_LOGGING,
      `[AutoOpen] ⚠️ Failed to trigger expansion on playback start:`,
      error
    );
  }
};

import { useState, useCallback } from 'react';
import { useDownloadActivityStore } from '@/shared/store/downloadActivityStore';
import { streamingResolver } from '../services/StreamingResolver';
import { queueManager } from '../services/QueueManager';
import { downloadManager } from '../services/DownloadManager';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface UseStreamingResolverReturn {
  resolveChapterUrl: (
    chapterId: string
  ) => Promise<{ url: string; mediaFileId: string } | null>;
  isResolving: (chapterId: string) => boolean;
  error: string | null;
}

/**
 * Hook for resolving streaming URLs with automatic prioritization
 * Integrates with download activity tracking
 */
export const useStreamingResolver = (): UseStreamingResolverReturn => {
  const [error, setError] = useState<string | null>(null);
  const { setResolving, clearResolving, isResolving } =
    useDownloadActivityStore();

  const resolveChapterUrl = useCallback(
    async (chapterId: string) => {
      if (!chapterId) return null;

      try {
        setError(null);
        setResolving(chapterId, true);

        // Try to resolve the streaming URL
        let resolved =
          await streamingResolver.resolveStreamingUrlForChapter(chapterId);

        if (resolved) {
          // Prioritize this chapter's downloads in the background
          try {
            await queueManager.prioritizeChapterDownloads(chapterId);
            await downloadManager.kick();
          } catch (prioritizeError) {
            // Non-fatal - streaming can continue even if prioritization fails
            logger.warn(
              ENABLE_LOGGING,
              'Failed to prioritize chapter downloads:',
              prioritizeError
            );
          }

          return resolved;
        }

        return null;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to resolve streaming URL';
        setError(errorMessage);
        logger.error(
          ENABLE_LOGGING,
          'Error resolving chapter streaming URL:',
          err
        );
        return null;
      } finally {
        clearResolving(chapterId);
      }
    },
    [setResolving, clearResolving]
  );

  return {
    resolveChapterUrl,
    isResolving,
    error,
  };
};

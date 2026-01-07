import { useCallback, useEffect, useRef } from 'react';
import { downloadManager } from '../services/DownloadManager';
import { queueManager } from '../services/QueueManager';
import { streamingResolver } from '../services/StreamingResolver';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface UseDownloadManagerReturn {
  // Queue operations
  recomputeQueue: () => Promise<void>;
  prioritizeChapter: (chapterId: string) => Promise<void>;
  prioritizeMediaFile: (mediaFileId: string) => Promise<void>;

  // Streaming
  resolveStreamingUrl: (
    chapterId: string
  ) => Promise<{ url: string; mediaFileId: string } | null>;

  // Initialization
  initialize: () => Promise<void>;

  // Legacy DownloadManager access (for migration period)
  manager: typeof downloadManager;
}

/**
 * React hook wrapper for download operations
 * Provides a cleaner interface and handles common patterns
 */
export const useDownloadManager = (): UseDownloadManagerReturn => {
  const initializedRef = useRef(false);

  // Auto-initialize on mount (can be disabled if needed)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      downloadManager
        .initialize()
        .catch(err =>
          logger.warn(
            ENABLE_LOGGING,
            'Download manager auto-initialization failed:',
            err
          )
        );
    }
  }, []);

  const recomputeQueue = useCallback(async () => {
    try {
      await queueManager.recomputeQueue();
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error recomputing download queue:', error);
      throw error;
    }
  }, []);

  const prioritizeChapter = useCallback(async (chapterId: string) => {
    try {
      await queueManager.prioritizeChapterDownloads(chapterId);
      // Kick the download manager to start processing
      await downloadManager.kick();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error prioritizing chapter downloads:',
        error
      );
      throw error;
    }
  }, []);

  const prioritizeMediaFile = useCallback(async (mediaFileId: string) => {
    try {
      await queueManager.prioritizeMediaFile(mediaFileId);
      await downloadManager.kick();
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error prioritizing media file:', error);
      throw error;
    }
  }, []);

  const resolveStreamingUrl = useCallback(async (chapterId: string) => {
    try {
      return await streamingResolver.resolveStreamingUrlForChapter(chapterId);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error resolving streaming URL:', error);
      return null;
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await downloadManager.initialize();
      initializedRef.current = true;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error initializing download manager:',
        error
      );
      throw error;
    }
  }, []);

  return {
    recomputeQueue,
    prioritizeChapter,
    prioritizeMediaFile,
    resolveStreamingUrl,
    initialize,
    manager: downloadManager, // For gradual migration
  };
};

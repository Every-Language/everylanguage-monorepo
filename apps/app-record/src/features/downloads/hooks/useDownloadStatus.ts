import { useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface DownloadRow {
  id: string;
  media_file_id: string;
  status: string;
  progress: number | null;
  downloaded_bytes: number | null;
  file_size_bytes: number | null;
  chapter_ref: string; // e.g., "John 1"
  version_name: string | null; // Audio version name
}

async function fetchDownloadStatus(): Promise<DownloadRow[]> {
  if (!powerSyncSystem.isInitialized) {
    return [];
  }

  try {
    // Use centralized query constant
    const rows = (await powerSyncSystem.getAll(
      QUERIES.DOWNLOAD_STATUS_ACTIVE
    )) as DownloadRow[];
    return rows;
  } catch (error) {
    logger.error(ENABLE_LOGGING, 'Error fetching download status:', error);
    return [];
  }
}

export interface UseDownloadStatusReturn {
  downloads: DownloadRow[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to manage download status with optimized updates
 * Prevents scroll position jumping by only updating when data actually changes
 */
export const useDownloadStatus = (): UseDownloadStatusReturn => {
  const { logQuery } = useQueryLogger('use-download-status');
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchStopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const task = InteractionManager.runAfterInteractions(async () => {
      if (cancelled) return;

      try {
        // Initial data load with query logging
        const initialDownloads = await logQuery(
          QUERIES.DOWNLOAD_STATUS_ACTIVE,
          async () => {
            return await fetchDownloadStatus();
          }
        );

        if (!cancelled) {
          setDownloads(initialDownloads);
          setIsLoading(false);
        }

        // Start reactive updates for download queue
        if (powerSyncSystem.isInitialized) {
          const queueStream = await powerSyncSystem.watch(
            QUERIES.DOWNLOAD_STATUS_ACTIVE
          );

          let mounted = true;

          // Handle download queue updates (optimized to preserve scroll position)
          (async () => {
            for await (const _ of queueStream as AsyncIterable<unknown>) {
              void _; // mark as used to satisfy no-unused-vars
              if (!mounted) break;
              try {
                const newDownloads = await fetchDownloadStatus();

                // Only update if the data actually changed to prevent unnecessary re-renders
                setDownloads(prevDownloads => {
                  // Quick comparison - if lengths differ, definitely update
                  if (prevDownloads.length !== newDownloads.length) {
                    return newDownloads;
                  }

                  // Check if any items have actually changed
                  const hasChanges = newDownloads.some((newItem, index) => {
                    const prevItem = prevDownloads[index];
                    return (
                      !prevItem ||
                      prevItem.id !== newItem.id ||
                      prevItem.status !== newItem.status ||
                      prevItem.progress !== newItem.progress
                    );
                  });

                  return hasChanges ? newDownloads : prevDownloads;
                });
              } catch (err) {
                logger.warn(
                  ENABLE_LOGGING,
                  'Download status update failed:',
                  err
                );
                setError('Failed to update download status');
              }
            }
          })();

          watchStopRef.current = () => {
            mounted = false;
          };
        }
      } catch (err) {
        logger.error(
          ENABLE_LOGGING,
          'Download status initialization failed:',
          err
        );
        setError('Failed to load download status');
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      task.cancel?.();
      watchStopRef.current?.();
      setError(null);
    };
  }, [logQuery]);

  return {
    downloads,
    isLoading,
    error,
  };
};

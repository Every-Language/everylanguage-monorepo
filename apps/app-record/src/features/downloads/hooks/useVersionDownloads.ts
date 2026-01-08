import { useState, useEffect, useCallback, useRef } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import {
  versionDownloadService,
  type VersionDownloadStatus,
} from '../services/VersionDownloadService';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface UseVersionDownloadsOptions {
  versionIds?: string[];
  enabled?: boolean;
  realtime?: boolean;
}

export interface UseVersionDownloadsReturn {
  // Single version methods (when versionIds has 1 item)
  status: VersionDownloadStatus | null;
  isDownloadEnabled: boolean;
  totalFiles: number;
  downloadedFiles: number;
  isActivelyDownloading: boolean;
  downloadProgress: number;

  // Batch methods (when versionIds has multiple items)
  statusMap: Record<string, VersionDownloadStatus>;

  // Actions
  toggleDownload: (versionId?: string) => Promise<boolean>;
  enableDownload: (versionId?: string) => Promise<void>;
  disableDownload: (versionId?: string) => Promise<void>;
  refresh: () => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing version downloads with real-time updates
 */
export const useVersionDownloads = (
  options: UseVersionDownloadsOptions = {}
): UseVersionDownloadsReturn => {
  const { versionIds = [], enabled = true, realtime = true } = options;

  const [statusMap, setStatusMap] = useState<
    Record<string, VersionDownloadStatus>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchStopRef = useRef<() => void>(() => {});

  // Single version status (for convenience when only one version)
  const singleVersionId = versionIds.length === 1 ? versionIds[0] : null;
  const status = singleVersionId ? statusMap[singleVersionId] || null : null;

  // Refresh data from service
  const refresh = useCallback(async () => {
    if (!enabled || versionIds.length === 0) return;

    try {
      setError(null);
      setIsLoading(true);

      let newStatusMap: Record<string, VersionDownloadStatus>;

      if (versionIds.length === 1) {
        const versionId = versionIds[0];
        if (versionId) {
          const singleStatus =
            await versionDownloadService.getVersionDownloadStatus(versionId);
          newStatusMap = { [versionId]: singleStatus };
        } else {
          newStatusMap = {};
        }
      } else {
        newStatusMap =
          await versionDownloadService.getBatchVersionDownloadStatus(
            versionIds
          );
      }

      setStatusMap(newStatusMap);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load download status';
      setError(errorMessage);
      logger.error(
        ENABLE_LOGGING,
        'Error refreshing version download status:',
        err
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, versionIds]);

  // Setup real-time updates
  useEffect(() => {
    if (!enabled || !realtime || versionIds.length === 0) return;

    let mounted = true;

    const setupWatch = async () => {
      try {
        if (!powerSyncSystem.isInitialized) return;

        // Watch for changes to download-related tables
        const watchQuery = `
          SELECT 
            av.id as version_id,
            mfd.download_status,
            dq.status as queue_status,
            usavd.audio_version_id
          FROM audio_versions av
          LEFT JOIN media_files mf ON mf.audio_version_id = av.id
          LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
          LEFT JOIN download_queue dq ON dq.media_file_id = mf.id
          LEFT JOIN user_saved_audio_versions_downloads usavd ON usavd.audio_version_id = av.id
          WHERE av.id IN (${versionIds.map(() => '?').join(',')})
        `;

        const stream = await powerSyncSystem.watch(watchQuery, versionIds);

        (async () => {
          for await (const _ of stream as AsyncIterable<unknown>) {
            void _; // mark as used
            if (!mounted) break;

            try {
              await refresh();
            } catch (refreshError) {
              logger.warn(
                ENABLE_LOGGING,
                'Error during real-time refresh:',
                refreshError
              );
            }
          }
        })();

        watchStopRef.current = () => {
          mounted = false;
        };
      } catch (watchError) {
        logger.warn(
          ENABLE_LOGGING,
          'Error setting up download status watch:',
          watchError
        );
      }
    };

    setupWatch();

    return () => {
      mounted = false;
      watchStopRef.current?.();
    };
  }, [enabled, realtime, versionIds, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Toggle download for a version
  const toggleDownload = useCallback(
    async (versionId?: string): Promise<boolean> => {
      const targetVersionId = versionId || singleVersionId;
      if (!targetVersionId) {
        throw new Error('No version ID provided');
      }

      try {
        setError(null);
        const newState =
          await versionDownloadService.toggleVersionDownload(targetVersionId);

        // Refresh immediately for UI feedback
        await refresh();

        return newState;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle download';
        setError(errorMessage);
        logger.error(ENABLE_LOGGING, 'Error toggling download:', err);
        throw err;
      }
    },
    [singleVersionId, refresh]
  );

  // Enable download for a version
  const enableDownload = useCallback(
    async (versionId?: string): Promise<void> => {
      const targetVersionId = versionId || singleVersionId;
      if (!targetVersionId) {
        throw new Error('No version ID provided');
      }

      try {
        setError(null);
        await versionDownloadService.enableVersionDownload(targetVersionId);
        await refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to enable download';
        setError(errorMessage);
        logger.error(ENABLE_LOGGING, 'Error enabling download:', err);
        throw err;
      }
    },
    [singleVersionId, refresh]
  );

  // Disable download for a version
  const disableDownload = useCallback(
    async (versionId?: string): Promise<void> => {
      const targetVersionId = versionId || singleVersionId;
      if (!targetVersionId) {
        throw new Error('No version ID provided');
      }

      try {
        setError(null);
        await versionDownloadService.disableVersionDownload(targetVersionId);
        await refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to disable download';
        setError(errorMessage);
        logger.error(ENABLE_LOGGING, 'Error disabling download:', err);
        throw err;
      }
    },
    [singleVersionId, refresh]
  );

  return {
    // Single version convenience properties
    status,
    isDownloadEnabled: status?.isDownloadEnabled ?? false,
    totalFiles: status?.totalFiles ?? 0,
    downloadedFiles: status?.downloadedFiles ?? 0,
    isActivelyDownloading: status?.isActivelyDownloading ?? false,
    downloadProgress: status?.downloadProgress ?? 0,

    // Batch properties
    statusMap,

    // Actions
    toggleDownload,
    enableDownload,
    disableDownload,
    refresh,

    // State
    isLoading,
    error,
  };
};

/**
 * Convenience hook for single version download management
 */
export const useVersionDownload = (
  versionId: string,
  options: Omit<UseVersionDownloadsOptions, 'versionIds'> = {}
) => {
  return useVersionDownloads({ ...options, versionIds: [versionId] });
};

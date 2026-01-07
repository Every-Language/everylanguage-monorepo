import { useEffect, useMemo, useRef, useState } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface ChapterDownloadStatus {
  totalFiles: number;
  downloadedFiles: number;
  activeDownloads: number;
  downloadedBytes: number;
  totalBytes: number;
}

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// Query moved to centralized constants

export function useChapterDownloadStatus(
  chapterId: string | null,
  audioVersionId: string | null
) {
  const { logQuery } = useQueryLogger('use-chapter-download-status');
  const [status, setStatus] = useState<ChapterDownloadStatus | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    stopRef.current?.();
    stopRef.current = () => {
      mounted = false;
    };

    if (!chapterId || !audioVersionId) {
      setStatus(null);
      return () => stopRef.current?.();
    }

    const assign = (row: Record<string, unknown> | undefined) => {
      setStatus({
        totalFiles: Number(row?.['total_files'] ?? 0),
        downloadedFiles: Number(row?.['downloaded_files'] ?? 0),
        activeDownloads: Number(row?.['active_downloads'] ?? 0),
        downloadedBytes: Number(row?.['downloaded_bytes'] ?? 0),
        totalBytes: Number(row?.['total_bytes'] ?? 0),
      });
    };

    const run = async () => {
      if (!powerSyncSystem.isInitialized) return;
      try {
        const initial = await logQuery(
          QUERIES.CHAPTER_DOWNLOAD_STATUS,
          async () => {
            return await powerSyncSystem.getAll(
              QUERIES.CHAPTER_DOWNLOAD_STATUS,
              [chapterId, audioVersionId]
            );
          }
        );
        if (mounted) assign((initial as Array<Record<string, unknown>>)[0]);

        const stream = await powerSyncSystem.watch(
          QUERIES.CHAPTER_DOWNLOAD_STATUS,
          [chapterId, audioVersionId]
        );
        const debounced = debounce(() => {
          logQuery(QUERIES.CHAPTER_DOWNLOAD_STATUS, async () => {
            return await powerSyncSystem.getAll(
              QUERIES.CHAPTER_DOWNLOAD_STATUS,
              [chapterId, audioVersionId]
            );
          })
            .then(rows => assign((rows as Array<Record<string, unknown>>)[0]))
            .catch(() => {});
        }, 150);

        (async () => {
          for await (const _ of stream as AsyncIterable<unknown>) {
            void _;
            if (!mounted) break;
            debounced();
          }
        })().catch(() => {});
      } catch (e) {
        logger.warn(ENABLE_LOGGING, 'useChapterDownloadStatus watch failed', e);
      }
    };

    run();
    return () => stopRef.current?.();
  }, [chapterId, audioVersionId, logQuery]);

  const state = useMemo(() => {
    if (!status) return 'unavailable' as const;
    const {
      totalFiles,
      downloadedFiles,
      activeDownloads,
      totalBytes,
      downloadedBytes,
    } = status;
    if (totalFiles <= 0) return 'unavailable' as const;
    if (downloadedFiles >= totalFiles && totalFiles > 0)
      return 'downloaded' as const;
    if (activeDownloads > 0 || (totalBytes > 0 && downloadedBytes > 0))
      return 'downloading' as const;
    return 'streaming' as const;
  }, [status]);

  const progress = useMemo(() => {
    if (!status) return 0;
    if (status.totalBytes <= 0) return 0;
    const ratio = status.downloadedBytes / status.totalBytes;
    return Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  }, [status]);

  return {
    status,
    state,
    progress,
  } as const;
}

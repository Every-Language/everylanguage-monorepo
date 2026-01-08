import { useEffect, useRef, useState } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { useQueryLogger } from '@/shared/hooks/useQueryLogger';
import { QUERIES } from '@/shared/constants/queries';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface ChapterDownloadAggregate {
  totalFiles: number;
  downloadedFiles: number;
  activeDownloads: number;
  downloadedBytes: number;
  totalBytes: number;
}

export type ChapterDownloadMap = Record<string, ChapterDownloadAggregate>;

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

/**
 * Book-level grouped watcher for per-chapter download/streaming availability.
 * Returns a map keyed by chapterId with aggregates and updates live.
 */
export function useBookChapterDownloadMap(
  bookId: string | null,
  audioVersionId: string | null
): ChapterDownloadMap {
  const { logQuery } = useQueryLogger('use-book-chapter-download-map');
  const [map, setMap] = useState<ChapterDownloadMap>({});
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    stopRef.current?.();
    stopRef.current = () => {
      mounted = false;
    };

    if (!bookId || !audioVersionId) {
      setMap({});
      return () => stopRef.current?.();
    }

    const setAggregates = (rows: Array<Record<string, unknown>>) => {
      const next: ChapterDownloadMap = {};
      for (const r of rows) {
        const chapterId = String(r['chapter_id']);
        next[chapterId] = {
          totalFiles: Number(r['total_files'] ?? 0),
          downloadedFiles: Number(r['downloaded_files'] ?? 0),
          activeDownloads: Number(r['active_downloads'] ?? 0),
          downloadedBytes: Number(r['downloaded_bytes'] ?? 0),
          totalBytes: Number(r['total_bytes'] ?? 0),
        };
      }
      setMap(next);
    };

    const run = async () => {
      if (!powerSyncSystem.isInitialized) return;
      try {
        // Initial snapshot
        const initial = await logQuery(
          QUERIES.BOOK_CHAPTER_DOWNLOAD_MAP,
          async () => {
            return await powerSyncSystem.getAll(
              QUERIES.BOOK_CHAPTER_DOWNLOAD_MAP,
              [audioVersionId, bookId]
            );
          }
        );
        if (mounted) setAggregates(initial as Array<Record<string, unknown>>);

        // Watch updates
        const stream = await powerSyncSystem.watch(
          QUERIES.BOOK_CHAPTER_DOWNLOAD_MAP,
          [audioVersionId, bookId]
        );
        const debounced = debounce(() => {
          logQuery(QUERIES.BOOK_CHAPTER_DOWNLOAD_MAP, async () => {
            return await powerSyncSystem.getAll(
              QUERIES.BOOK_CHAPTER_DOWNLOAD_MAP,
              [audioVersionId, bookId]
            );
          })
            .then(rows => {
              if (mounted)
                setAggregates(rows as Array<Record<string, unknown>>);
            })
            .catch(() => {});
        }, 200);

        (async () => {
          for await (const _ of stream as AsyncIterable<unknown>) {
            void _;
            if (!mounted) break;
            debounced();
          }
        })().catch(() => {});
      } catch (e) {
        logger.warn(
          ENABLE_LOGGING,
          'useBookChapterDownloadMap watch failed',
          e
        );
      }
    };

    run();

    return () => {
      stopRef.current?.();
    };
  }, [bookId, audioVersionId, logQuery]);

  return map;
}

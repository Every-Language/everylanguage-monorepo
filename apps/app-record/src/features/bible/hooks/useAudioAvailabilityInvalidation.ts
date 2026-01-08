import { useEffect, useRef } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { queryClient } from '@/shared/services/query/queryClient';

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

/**
 * Watches media availability for a specific audio version and invalidates
 * TanStack queries for chapters metadata as rows arrive/change locally.
 *
 * This hook is intentionally scoped by audioVersionId and attaches only
 * while a consumer screen is mounted.
 */
export function useAudioAvailabilityInvalidation(
  audioVersionId: string | null
): void {
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    stopRef.current?.();
    stopRef.current = () => {
      mounted = false;
    };

    if (!audioVersionId) return () => stopRef.current?.();
    if (!powerSyncSystem.isInitialized) return () => stopRef.current?.();

    const invalidate = debounce(() => {
      queryClient
        .invalidateQueries({
          predicate: ({ queryKey }) =>
            Array.isArray(queryKey) && queryKey[0] === 'chapters-metadata',
        })
        .catch(() => {});
    }, 250);

    (async () => {
      try {
        const stream = await powerSyncSystem.watch(
          `SELECT chapter_id, COUNT(1) AS c
           FROM media_files
           WHERE deleted_at IS NULL AND audio_version_id = ?
           GROUP BY chapter_id`,
          [audioVersionId]
        );

        (async () => {
          for await (const _ of stream as AsyncIterable<unknown>) {
            void _; // consume
            if (!mounted) break;
            invalidate();
          }
        })().catch(() => {});
      } catch {
        // best-effort only
      }
    })();

    return () => {
      stopRef.current?.();
    };
  }, [audioVersionId]);
}

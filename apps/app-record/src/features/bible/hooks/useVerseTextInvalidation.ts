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
 * Watches verse_texts availability for a chapter and text version.
 * Invalidates the 'verses-with-texts' query when local rows change.
 */
export function useVerseTextInvalidation(
  chapterId: string | null,
  textVersionId: string | null
): void {
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let mounted = true;
    stopRef.current?.();
    stopRef.current = () => {
      mounted = false;
    };

    if (!chapterId || !textVersionId) return () => stopRef.current?.();
    if (!powerSyncSystem.isInitialized) return () => stopRef.current?.();

    const invalidate = debounce(() => {
      queryClient
        .invalidateQueries({
          predicate: ({ queryKey }) =>
            Array.isArray(queryKey) &&
            queryKey[0] === 'verses-with-texts' &&
            (queryKey[1] === chapterId || queryKey[2] === textVersionId),
        })
        .catch(() => {});
    }, 250);

    (async () => {
      try {
        const stream = await powerSyncSystem.watch(
          `SELECT COUNT(1) AS c
           FROM verse_texts vt
           JOIN verses v ON v.id = vt.verse_id
           WHERE vt.text_version_id = ? AND v.chapter_id = ? AND vt.deleted_at IS NULL`,
          [textVersionId, chapterId]
        );

        (async () => {
          for await (const _ of stream as AsyncIterable<unknown>) {
            void _;
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
  }, [chapterId, textVersionId]);
}

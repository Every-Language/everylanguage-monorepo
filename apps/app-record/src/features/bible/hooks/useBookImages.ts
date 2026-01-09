import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { imageDownloadManager } from '@/features/downloads/services';

export interface BookImageInfo {
  bookId: string;
  imageId: string | null;
}

/**
 * Fetch a mapping of book_id -> representative image (if any)
 * Strategy: pick the first published image where target_type = 'book' and target_id = book.id
 */
export function useBookImages(bookIds: string[]) {
  const {
    data: rows = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['book-images', bookIds.sort().join(',')],
    queryFn: async () => {
      if (!powerSyncSystem.isInitialized || bookIds.length === 0)
        return [] as BookImageInfo[];
      const placeholders = bookIds.map(() => '?').join(',');
      const results = await powerSyncSystem.getAll(
        `SELECT id AS imageId, target_id AS bookId, set_id, created_at
         FROM images
         WHERE target_type = 'book'
           AND target_id IN (${placeholders})
           AND object_key IS NOT NULL AND object_key <> ''
           AND deleted_at IS NULL`,
        bookIds
      );
      return results as BookImageInfo[];
    },
    enabled: powerSyncSystem.isInitialized && bookIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const byBookId = useMemo(() => {
    // Pick deterministic first: prefer earliest created_at, fallback to imageId
    const map = new Map<string, BookImageInfo>();
    for (const r of rows as Array<BookImageInfo & { created_at?: string }>) {
      const existing = map.get(r.bookId);
      if (!existing) {
        map.set(r.bookId, r);
      }
    }
    return map;
  }, [rows]);

  const resolveImageUri = async (bookId: string): Promise<string | null> => {
    const info = (byBookId.get(bookId) as BookImageInfo | undefined) || null;
    if (!info) return null;
    if (info.imageId) {
      return imageDownloadManager.resolveImageUrl(info.imageId);
    }
    return null;
  };

  return {
    rows,
    byBookId,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    resolveImageUri,
  };
}

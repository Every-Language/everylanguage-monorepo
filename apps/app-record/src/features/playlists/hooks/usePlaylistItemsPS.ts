import { useQuery } from '@tanstack/react-query';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import type { PlaylistItem, PlaylistItemWithVerses } from '../types';
import { VerseWithText, VerseWithTextRow } from '@/features/bible';

interface UsePlaylistItemsPowerSyncReturn {
  playlistItems: PlaylistItemWithVerses[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get all playlistsItems from PowerSync database with TanStack Query caching
 */
export const usePlaylistItemsPS = ({
  playlistId,
  versionId,
}: {
  playlistId: string;
  versionId: string;
}): UsePlaylistItemsPowerSyncReturn => {
  const {
    data: playlistItems = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['playlistItems', playlistId],
    queryFn: async (): Promise<PlaylistItemWithVerses[]> => {
      if (!powerSyncSystem.isInitialized) {
        throw new Error('PowerSync not initialized');
      }

      const results: PlaylistItem[] = await powerSyncSystem.getAll(
        `SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY order_index ASC`,
        [playlistId]
      );

      const playlistItemsWithVerses = await Promise.all(
        results.map(async item => {
          if (item.custom_text) {
            return { ...item, verses: [] };
          }

          const [startBook, startChapter, startVerse] =
            item?.start_verse_id?.split('-') || [];

          const [, , endVerse] = item?.end_verse_id?.split('-') || [];

          const chapterId = `${startBook}-${startChapter}`;

          const bookInfo = await powerSyncSystem.getAll(
            `SELECT id, name FROM books b WHERE b.id = ?`,
            [startBook]
          );

          const title = bookInfo[0].name + ' ' + startChapter;

          const results = await powerSyncSystem.getAll(
            `SELECT
                v.*,
                vt.id as verse_text_id,
                vt.text_version_id,
                vt.verse_text,
                vt.publish_status,
                vt.version,
                vt.created_at as text_created_at,
                vt.updated_at as text_updated_at
            FROM
                verses v
            LEFT JOIN verse_texts vt ON v.id = vt.verse_id AND vt.text_version_id = ?
            WHERE
                v.chapter_id = ?
                AND v.verse_number >= ?
                AND v.verse_number <= ?
            ORDER BY
                v.verse_number;`,
            [versionId, chapterId, startVerse, endVerse]
          );

          // Transform to VerseWithText format
          const verses: VerseWithText[] = results.map(
            (row: VerseWithTextRow) => {
              const verse = {
                id: row.id,
                chapter_id: row.chapter_id,
                verse_number: row.verse_number,
                global_order: row.global_order,
                created_at: row.created_at,
                updated_at: row.updated_at,
              };

              const verseText =
                row.verse_text_id &&
                row.text_version_id &&
                row.verse_text &&
                row.publish_status &&
                row.version
                  ? {
                      id: row.verse_text_id,
                      verse_id: row.id,
                      text_version_id: row.text_version_id,
                      verse_text: row.verse_text,
                      publish_status: row.publish_status,
                      version: row.version,
                      created_at: row.text_created_at || row.created_at || '',
                      updated_at: row.text_updated_at || row.updated_at || '',
                    }
                  : null;

              return {
                verse,
                verseText,
              };
            }
          );

          return { ...item, verses, title };
        })
      );

      return playlistItemsWithVerses;
    },
    enabled: powerSyncSystem.isInitialized,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    playlistItems,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => refetch(),
  };
};

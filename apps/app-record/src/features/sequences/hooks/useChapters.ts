import { useQuery } from '@powersync/react';
import type { Chapter } from '../types/sequence';

/**
 * Hook for fetching chapters for a book from local database
 *
 * Queries chapters ordered by chapter_number.
 */
export const useChapters = (bookId: string) => {
  const { data: chapters, error } = useQuery<Chapter>(
    `SELECT id, chapter_number, book_id, total_verses, global_order
     FROM chapters 
     WHERE book_id = ? 
     ORDER BY chapter_number ASC`,
    [bookId]
  );

  return {
    chapters,
    error,
  };
};

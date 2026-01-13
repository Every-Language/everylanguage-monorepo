import { useQuery } from '@powersync/react';
import type { Chapter } from '../types/sequence';

/**
 * Hook for fetching chapters for multiple books from local database
 *
 * Queries chapters for books that have sequences, ordered by book_id and chapter_number.
 */
export const useChaptersForBooks = (bookIds: string[]) => {
  // Create placeholders for SQL IN clause
  const placeholders =
    bookIds.length > 0 ? bookIds.map(() => '?').join(',') : '';

  const { data: chapters, error } = useQuery<Chapter>(
    bookIds.length > 0
      ? `SELECT id, chapter_number, book_id, total_verses, global_order
         FROM chapters 
         WHERE book_id IN (${placeholders})
         ORDER BY book_id, chapter_number ASC`
      : `SELECT id, chapter_number, book_id, total_verses, global_order
         FROM chapters 
         WHERE 1 = 0`,
    bookIds.length > 0 ? bookIds : []
  );

  return {
    chapters: chapters || [],
    error,
  };
};

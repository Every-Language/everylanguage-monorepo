import { useQuery } from '@powersync/react';
import type { Book } from '@/shared/types/sequence';

/**
 * Hook for fetching books from local database
 *
 * Queries books ordered by book_number.
 */
export const useBooks = () => {
  const { data: books, error } = useQuery<Book>(
    `SELECT id, name, book_number, bible_version_id, global_order, testament
     FROM books 
     ORDER BY book_number ASC`
  );

  return {
    books,
    error,
  };
};

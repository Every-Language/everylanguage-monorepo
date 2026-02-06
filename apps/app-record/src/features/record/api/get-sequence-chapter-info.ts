import { useQuery } from '@powersync/react';

/**
 * Chapter info for a sequence
 */
export interface SequenceChapterInfo {
  book_name: string;
  chapter_number: number;
}

/**
 * Query key factory for sequence chapter info queries
 */
export const sequenceChapterInfoKeys = {
  all: ['sequenceChapterInfo'] as const,
  bySequence: (sequenceId: string) =>
    [...sequenceChapterInfoKeys.all, sequenceId] as const,
};

/**
 * Hook for fetching chapter/book info for a sequence
 *
 * Queries chapter and book information for displaying subtitles.
 * Returns book name and chapter number.
 *
 * This is the API layer hook that wraps the PowerSync query.
 * Components should use this hook instead of directly querying PowerSync.
 */
export const useGetSequenceChapterInfo = (sequenceId: string) => {
  const { data: chapterInfo, error } = useQuery<SequenceChapterInfo>(
    `SELECT 
       b.name as book_name,
       c.chapter_number
     FROM sequences s
     JOIN chapters c ON s.chapter_id = c.id
     JOIN books b ON c.book_id = b.id
     WHERE s.id = ?`,
    [sequenceId]
  );

  return {
    chapterInfo: chapterInfo?.[0] ?? null,
    error,
  };
};

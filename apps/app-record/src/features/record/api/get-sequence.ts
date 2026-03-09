import { useQuery } from '@powersync/react';
import type { Sequence } from '@/shared/types/sequence';

/**
 * Query key factory for sequence queries
 */
export const sequenceKeys = {
  all: ['sequences'] as const,
  byId: (sequenceId: string) => [...sequenceKeys.all, sequenceId] as const,
};

/**
 * Hook for fetching a single sequence by ID
 *
 * Queries sequence from PowerSync local database.
 *
 * This is the API layer hook that wraps the PowerSync query.
 * Components should use this hook instead of directly querying PowerSync.
 */
export const useGetSequence = (sequenceId: string) => {
  const { data: sequences, error } = useQuery<Sequence>(
    `SELECT id, name, description, book_id, chapter_id, is_bible_audio, 
            start_verse_id, end_verse_id, project_id, created_at, updated_at, 
            deleted_at, created_by, upload_status, publish_status, check_status
     FROM sequences 
     WHERE id = ? AND deleted_at IS NULL`,
    [sequenceId]
  );

  return {
    sequence: sequences?.[0] ?? null,
    error,
  };
};

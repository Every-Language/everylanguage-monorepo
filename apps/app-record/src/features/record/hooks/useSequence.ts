import { useQuery } from '@powersync/react';
import type { Sequence } from '@/features/sequences/types/sequence';

/**
 * Hook for fetching a single sequence by ID
 *
 * Queries sequence from PowerSync local database.
 */
export const useSequence = (sequenceId: string) => {
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

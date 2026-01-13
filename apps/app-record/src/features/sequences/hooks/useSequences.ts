import { useQuery } from '@powersync/react';
import type { Sequence } from '../types/sequence';

/**
 * Hook for fetching sequences for a project
 *
 * Queries active sequences from PowerSync local database.
 * Only returns sequences that haven't been deleted (deleted_at IS NULL).
 * Results are ordered by creation date (newest first).
 */
export const useSequences = (projectId: string) => {
  const { data: sequences, error } = useQuery<Sequence>(
    `SELECT id, name, description, book_id, chapter_id, is_bible_audio, 
            start_verse_id, end_verse_id, project_id, created_at, updated_at, 
            deleted_at, created_by, upload_status, publish_status, check_status
     FROM sequences 
     WHERE project_id = ? AND deleted_at IS NULL 
     ORDER BY created_at DESC`,
    [projectId]
  );

  return {
    sequences,
    error,
  };
};

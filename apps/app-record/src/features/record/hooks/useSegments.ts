import { useQuery } from '@powersync/react';
import type { Segment } from '../types';

/**
 * Hook for fetching segments for a sequence
 *
 * Queries active segments from PowerSync local database.
 * Only returns segments that haven't been deleted (deleted_at IS NULL).
 * Results are ordered by segment_index (ascending).
 */
export const useSegments = (sequenceId: string) => {
  const { data: segments, error } = useQuery<Segment>(
    `SELECT id, type, sequence_id, project_id, segment_index, 
            created_at, created_by, updated_at, deleted_at,
            is_deleted, is_numbered, storage_provider, object_key,
            original_filename, file_type, segment_color
     FROM segments 
     WHERE sequence_id = ? AND deleted_at IS NULL 
     ORDER BY segment_index ASC`,
    [sequenceId]
  );

  return {
    segments,
    error,
  };
};

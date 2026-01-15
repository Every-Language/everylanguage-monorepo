import { useQuery } from '@powersync/react';

/**
 * Segment type from database
 */
export interface Segment {
  id: string;
  type: string;
  sequence_id: string;
  project_id: string;
  segment_index: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  is_deleted: number;
  is_numbered: number;
  storage_provider: string;
  object_key: string;
  original_filename: string;
  file_type: string;
  segment_color: string | null;
}

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

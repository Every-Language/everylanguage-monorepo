import { Database } from '@everylanguage/shared-types';

/**
 * Segment type from database
 */
export type Segment = Database['public']['Tables']['segments']['Row'];

/**
 * Temporary segment during recording session
 */
export interface TempSegment {
  id: string;
  local_file_path: string;
  sequence_id: string;
  project_id: string | null;
  segment_index: number;
  is_hidden: boolean;
  audio_level: number;
  duration_seconds: number;
  start_time_ms: number;
  end_time_ms: number;
  recording_status: 'recording' | 'completed' | 'editing';
  created_at: string;
  updated_at: string;
}

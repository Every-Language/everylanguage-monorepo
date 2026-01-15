import { PowerSyncSystem } from '@/shared/infrastructure/powersync';
import { logger } from '@/shared/utils/logger';
import { FilePathService } from './FilePathService';
import type { SegmentTempRecord } from '@/powersync/LocalSchema';

/**
 * Recording Service
 *
 * Manages recording segments in the local database.
 * Handles temporary segments (segments_temp) and insertion into final segments table.
 */
export interface TempSegment {
  id: string;
  local_file_path: string;
  sequence_id: string;
  project_id: string | null;
  segment_index: number;
  is_hidden: number; // 0 or 1
  audio_level: number;
  duration_seconds: number;
  start_time_ms: number;
  end_time_ms: number;
  recording_status: 'recording' | 'completed' | 'editing';
  created_at: string;
  updated_at: string;
}

/**
 * Segment insertion result
 */
export interface SegmentInsertionResult {
  insertedCount: number;
  deletedCount: number;
}

export class RecordingService {
  private static powerSyncSystem = PowerSyncSystem.getInstance();
  private static readonly TEMP_INDEX_START = 10000;

  /**
   * Generate UUID for segment ID
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get next temporary segment index for a sequence
   *
   * @param sequenceId - Sequence ID
   * @returns Next available index (starting from 10000)
   */
  static async getNextTempIndex(sequenceId: string): Promise<number> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const row = (await this.powerSyncSystem.get(
      `SELECT MAX(segment_index) as max_index 
       FROM segments_temp 
       WHERE sequence_id = ?`,
      [sequenceId]
    )) as { max_index: number | null } | null;

    const maxIndex = row?.max_index ?? null;
    if (maxIndex === null || maxIndex < this.TEMP_INDEX_START) {
      return this.TEMP_INDEX_START;
    }

    return maxIndex + 1;
  }

  /**
   * Create a temporary segment
   *
   * @param params - Segment parameters
   * @returns Created segment
   */
  static async createTempSegment(params: {
    sequenceId: string;
    projectId: string | null;
    localFilePath: string;
    audioLevel: number;
    durationSeconds: number;
    startTimeMs: number;
    endTimeMs: number;
    recordingStatus?: 'recording' | 'completed' | 'editing';
  }): Promise<TempSegment> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const segmentId = this.generateUUID();
    const now = new Date().toISOString();
    const segmentIndex = await this.getNextTempIndex(params.sequenceId);
    const recordingStatus = params.recordingStatus ?? 'completed';

    // Determine if segment should be hidden based on audio level
    // This will be compared against speaker_threshold when displaying
    const isHidden = 0; // Will be updated when filtering

    await this.powerSyncSystem.execute(
      `INSERT INTO segments_temp (
        id,
        local_file_path,
        sequence_id,
        project_id,
        segment_index,
        is_hidden,
        audio_level,
        duration_seconds,
        start_time_ms,
        end_time_ms,
        recording_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        segmentId,
        params.localFilePath,
        params.sequenceId,
        params.projectId,
        segmentIndex,
        isHidden,
        params.audioLevel,
        params.durationSeconds,
        params.startTimeMs,
        params.endTimeMs,
        recordingStatus,
        now,
        now,
      ]
    );

    logger.info('Created temporary segment', { segmentId, segmentIndex });

    return {
      id: segmentId,
      local_file_path: params.localFilePath,
      sequence_id: params.sequenceId,
      project_id: params.projectId,
      segment_index: segmentIndex,
      is_hidden: isHidden,
      audio_level: params.audioLevel,
      duration_seconds: params.durationSeconds,
      start_time_ms: params.startTimeMs,
      end_time_ms: params.endTimeMs,
      recording_status: recordingStatus,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Update temporary segment
   *
   * @param segmentId - Segment ID
   * @param updates - Fields to update
   */
  static async updateTempSegment(
    segmentId: string,
    updates: Partial<
      Pick<
        TempSegment,
        | 'is_hidden'
        | 'audio_level'
        | 'duration_seconds'
        | 'start_time_ms'
        | 'end_time_ms'
        | 'recording_status'
        | 'local_file_path'
      >
    >
  ): Promise<void> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (updates.is_hidden !== undefined) {
      updateFields.push('is_hidden = ?');
      updateValues.push(updates.is_hidden);
    }
    if (updates.audio_level !== undefined) {
      updateFields.push('audio_level = ?');
      updateValues.push(updates.audio_level);
    }
    if (updates.duration_seconds !== undefined) {
      updateFields.push('duration_seconds = ?');
      updateValues.push(updates.duration_seconds);
    }
    if (updates.start_time_ms !== undefined) {
      updateFields.push('start_time_ms = ?');
      updateValues.push(updates.start_time_ms);
    }
    if (updates.end_time_ms !== undefined) {
      updateFields.push('end_time_ms = ?');
      updateValues.push(updates.end_time_ms);
    }
    if (updates.recording_status !== undefined) {
      updateFields.push('recording_status = ?');
      updateValues.push(updates.recording_status);
    }
    if (updates.local_file_path !== undefined) {
      updateFields.push('local_file_path = ?');
      updateValues.push(updates.local_file_path);
    }

    if (updateFields.length === 0) {
      return; // No updates
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(segmentId);

    await this.powerSyncSystem.execute(
      `UPDATE segments_temp SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  }

  /**
   * Get temporary segments for a sequence
   *
   * @param sequenceId - Sequence ID
   * @param recordingStatus - Optional status filter
   * @returns Array of temporary segments
   */
  static async getTempSegments(
    sequenceId: string,
    recordingStatus?: 'recording' | 'completed' | 'editing'
  ): Promise<TempSegment[]> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    // Tables are automatically created by PowerSync from LocalSchema.ts

    let query = `SELECT * FROM segments_temp 
                 WHERE sequence_id = ? 
                 ORDER BY segment_index ASC`;
    const params: unknown[] = [sequenceId];

    if (recordingStatus) {
      query = `SELECT * FROM segments_temp 
               WHERE sequence_id = ? AND recording_status = ? 
               ORDER BY segment_index ASC`;
      params.push(recordingStatus);
    }

    const rows = (await this.powerSyncSystem.getAll(
      query,
      params
    )) as SegmentTempRecord[];

    return rows.map(row => ({
      id: row.id,
      local_file_path: row.local_file_path,
      sequence_id: row.sequence_id,
      project_id: row.project_id,
      segment_index: row.segment_index,
      is_hidden: row.is_hidden,
      audio_level: row.audio_level,
      duration_seconds: row.duration_seconds,
      start_time_ms: row.start_time_ms,
      end_time_ms: row.end_time_ms,
      recording_status: row.recording_status as
        | 'recording'
        | 'completed'
        | 'editing',
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Delete temporary segment and its file
   *
   * @param segmentId - Segment ID
   */
  static async deleteTempSegment(segmentId: string): Promise<void> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    // Get segment to find file path
    const segment = (await this.powerSyncSystem.get(
      'SELECT local_file_path FROM segments_temp WHERE id = ?',
      [segmentId]
    )) as { local_file_path: string } | null;

    if (segment) {
      // Delete file
      await FilePathService.deleteFile(segment.local_file_path);
    }

    // Delete database record
    await this.powerSyncSystem.execute(
      'DELETE FROM segments_temp WHERE id = ?',
      [segmentId]
    );

    logger.info('Deleted temporary segment', { segmentId });
  }

  /**
   * Get insertion index for segments (where to insert in sequence)
   *
   * @param sequenceId - Sequence ID
   * @param insertAfterIndex - Insert after this segment index (null = beginning)
   * @returns Next segment index to use
   */
  private static async getInsertionIndex(
    sequenceId: string,
    insertAfterIndex: number | null
  ): Promise<number> {
    if (insertAfterIndex === null) {
      // Insert at beginning
      const row = (await this.powerSyncSystem.get(
        `SELECT MIN(segment_index) as min_index 
         FROM segments 
         WHERE sequence_id = ? AND deleted_at IS NULL`,
        [sequenceId]
      )) as { min_index: number | null } | null;

      const minIndex = row?.min_index ?? null;
      if (minIndex === null) {
        return 0; // First segment
      }
      return minIndex - 1; // Insert before first
    }

    // Insert after specified index
    return insertAfterIndex + 1;
  }

  /**
   * Recalculate segment indices after insertion point
   *
   * @param sequenceId - Sequence ID
   * @param insertionIndex - Index where segments were inserted
   * @param insertedCount - Number of segments inserted
   */
  private static async recalculateSegmentIndices(
    sequenceId: string,
    insertionIndex: number,
    insertedCount: number
  ): Promise<void> {
    // Update all segments after insertion point
    await this.powerSyncSystem.execute(
      `UPDATE segments 
       SET segment_index = segment_index + ?, updated_at = ? 
       WHERE sequence_id = ? 
         AND segment_index >= ? 
         AND deleted_at IS NULL`,
      [
        insertedCount,
        new Date().toISOString(),
        sequenceId,
        insertionIndex + insertedCount,
      ]
    );
  }

  /**
   * Insert non-hidden temporary segments into final segments table
   *
   * @param sequenceId - Sequence ID
   * @param projectId - Project ID
   * @param insertAfterIndex - Insert after this segment index (null = beginning)
   * @param userId - User ID for created_by
   * @returns Insertion result
   */
  static async insertSegments(
    sequenceId: string,
    projectId: string,
    insertAfterIndex: number | null,
    userId: string | null
  ): Promise<SegmentInsertionResult> {
    if (!this.powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    // Get non-hidden completed segments
    const tempSegments = await this.getTempSegments(sequenceId, 'completed');
    const segmentsToInsert = tempSegments.filter(s => s.is_hidden === 0);

    if (segmentsToInsert.length === 0) {
      // Delete all temp segments (including hidden ones)
      const allTempSegments = await this.getTempSegments(sequenceId);
      for (const segment of allTempSegments) {
        await this.deleteTempSegment(segment.id);
      }
      return { insertedCount: 0, deletedCount: allTempSegments.length };
    }

    // Get insertion index
    const insertionIndex = await this.getInsertionIndex(
      sequenceId,
      insertAfterIndex
    );

    const now = new Date().toISOString();
    let currentIndex = insertionIndex;

    // Insert segments
    for (const tempSegment of segmentsToInsert) {
      // Copy file to final location
      const finalRelativePath = FilePathService.getRelativePath(
        sequenceId,
        tempSegment.id
      );
      await FilePathService.copyFile(
        tempSegment.local_file_path,
        finalRelativePath
      );

      // Insert into segments table
      await this.powerSyncSystem.execute(
        `INSERT INTO segments (
          id,
          type,
          sequence_id,
          project_id,
          segment_index,
          created_at,
          created_by,
          updated_at,
          deleted_at,
          is_deleted,
          is_numbered,
          storage_provider,
          object_key,
          original_filename,
          file_type,
          segment_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tempSegment.id,
          'target', // All segments are type 'target'
          sequenceId,
          projectId,
          currentIndex,
          now,
          userId,
          now,
          null, // deleted_at
          0, // is_deleted
          0, // is_numbered
          'local', // storage_provider
          finalRelativePath, // object_key (relative path)
          `${tempSegment.id}.m4a`, // original_filename
          'audio/m4a', // file_type
          null, // segment_color
        ]
      );

      currentIndex++;
    }

    // Recalculate indices for existing segments after insertion point
    await this.recalculateSegmentIndices(
      sequenceId,
      insertionIndex,
      segmentsToInsert.length
    );

    // Delete all temp segments (including hidden ones)
    const allTempSegments = await this.getTempSegments(sequenceId);
    let deletedCount = 0;
    for (const segment of allTempSegments) {
      await this.deleteTempSegment(segment.id);
      deletedCount++;
    }

    logger.info('Inserted segments into sequence', {
      sequenceId,
      insertedCount: segmentsToInsert.length,
      insertionIndex,
    });

    return {
      insertedCount: segmentsToInsert.length,
      deletedCount,
    };
  }
}

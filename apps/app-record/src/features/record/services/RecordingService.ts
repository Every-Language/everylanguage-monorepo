import { powerSyncSystem } from '@/shared/infrastructure/powersync';
import { logger } from '@/shared/utils/logger';
import { FilePathService } from './FilePathService';
import type { TempSegment } from '../types';

/**
 * Segment insertion result
 */
export interface SegmentInsertionResult {
  insertedCount: number;
  deletedCount: number;
}

/**
 * Insert segments parameters
 */
export interface InsertSegmentsParams {
  sequenceId: string;
  projectId: string;
  tempSegments: TempSegment[];
  insertAfterIndex: number | null;
  userId: string | null;
}

/**
 * Recording Service
 *
 * Business logic for recording operations.
 * Separated from hooks for reusability and testability.
 */
export class RecordingService {
  /**
   * Get insertion index for segments (where to insert in sequence)
   */
  private static async getInsertionIndex(
    sequenceId: string,
    insertAfterIndex: number | null
  ): Promise<number> {
    if (insertAfterIndex === null) {
      // Insert at beginning
      const row = (await powerSyncSystem.get(
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
   */
  private static async recalculateSegmentIndices(
    sequenceId: string,
    insertionIndex: number,
    insertedCount: number
  ): Promise<void> {
    // Update all segments after insertion point
    await powerSyncSystem.execute(
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
   * Insert temporary segments into final segments table
   */
  static async insertSegments(
    params: InsertSegmentsParams
  ): Promise<SegmentInsertionResult> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync database not initialized');
    }

    const { sequenceId, projectId, tempSegments, insertAfterIndex, userId } =
      params;

    // Filter to only non-hidden completed segments
    const segmentsToInsert = tempSegments.filter(
      s => s.recording_status === 'completed' && !s.is_hidden
    );

    if (segmentsToInsert.length === 0) {
      // Clean up files for all segments (including hidden ones)
      let deletedCount = 0;
      for (const segment of tempSegments) {
        try {
          await FilePathService.deleteFile(segment.local_file_path);
          deletedCount++;
        } catch (err) {
          logger.error('Failed to delete temp segment file:', err);
        }
      }
      return { insertedCount: 0, deletedCount };
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
      await powerSyncSystem.execute(
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

    // Clean up files for all temp segments (including hidden ones)
    let deletedCount = 0;
    for (const segment of tempSegments) {
      try {
        await FilePathService.deleteFile(segment.local_file_path);
        deletedCount++;
      } catch (err) {
        logger.error('Failed to delete temp segment file:', err);
      }
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

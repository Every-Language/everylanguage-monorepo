/**
 * ChapterMetadataService - Manages pre-computed chapter metadata for performance optimization
 *
 * This service maintains a denormalized table of chapter metadata to avoid expensive
 * complex queries at runtime. It provides fast lookups while keeping data fresh.
 */

import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import type { ChapterMetadataRecord } from '../../../../powersync/LocalSchema';

const ENABLE_LOGGING = true;

export interface ChapterMetadataInput {
  chapterId: string;
  audioVersionId: string;
  bookId: string;
  chapterNumber: number;
  bookName: string;
  title: string;
  verseCount: number;
  verseRange: string;
  mediaFileCount: number;
  downloadedFileCount: number;
  totalDownloadedBytes: number;
  totalFileSizeBytes: number;
  downloadProgressRatio: number;
}

export class ChapterMetadataService {
  private static instance: ChapterMetadataService;
  private updateQueue: Set<string> = new Set(); // Track pending updates
  private isProcessing = false;

  static getInstance(): ChapterMetadataService {
    if (!ChapterMetadataService.instance) {
      ChapterMetadataService.instance = new ChapterMetadataService();
    }
    return ChapterMetadataService.instance;
  }

  /**
   * Get chapter metadata from the fast lookup table
   */
  async getChapterMetadata(
    chapterId: string,
    audioVersionId: string
  ): Promise<ChapterMetadataRecord | null> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return null;
      }

      const result = await powerSyncSystem.get(
        `SELECT * FROM chapter_metadata 
         WHERE chapter_id = ? AND audio_version_id = ?`,
        [chapterId, audioVersionId]
      );

      return result as ChapterMetadataRecord | null;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error getting chapter metadata:', error);
      return null;
    }
  }

  /**
   * Get all chapter metadata for a book and audio version (fast path)
   */
  async getBookChapterMetadata(
    bookId: string,
    audioVersionId: string
  ): Promise<ChapterMetadataRecord[]> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return [];
      }

      const results = await powerSyncSystem.getAll(
        `SELECT * FROM chapter_metadata 
         WHERE book_id = ? AND audio_version_id = ?
         ORDER BY chapter_number ASC`,
        [bookId, audioVersionId]
      );

      return results as ChapterMetadataRecord[];
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error getting book chapter metadata:',
        error
      );
      return [];
    }
  }

  /**
   * Update metadata for a specific chapter/audio version combination
   */
  async updateChapterMetadata(
    chapterId: string,
    audioVersionId: string
  ): Promise<void> {
    const key = `${chapterId}_${audioVersionId}`;

    // Add to update queue to avoid duplicate work
    this.updateQueue.add(key);

    // Process updates in batch to avoid overwhelming the database
    if (!this.isProcessing) {
      this.processUpdateQueue();
    }
  }

  /**
   * Compute and store metadata for a specific chapter
   */
  private async computeAndStoreMetadata(
    chapterId: string,
    audioVersionId: string
  ): Promise<void> {
    try {
      const metadata = await this.computeChapterMetadata(
        chapterId,
        audioVersionId
      );
      if (!metadata) {
        logger.warn(
          ENABLE_LOGGING,
          'No metadata computed for chapter:',
          chapterId
        );
        return;
      }

      await this.storeMetadata(metadata);

      logger.debug(ENABLE_LOGGING, 'Updated metadata for chapter:', {
        chapterId,
        audioVersionId,
        mediaFileCount: metadata.mediaFileCount,
        downloadedFileCount: metadata.downloadedFileCount,
      });
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error computing chapter metadata:', error);
    }
  }

  /**
   * Compute metadata using the complex query (same logic as original)
   */
  private async computeChapterMetadata(
    chapterId: string,
    audioVersionId: string
  ): Promise<ChapterMetadataInput | null> {
    try {
      const result = await powerSyncSystem.get(
        `
        SELECT 
          c.id as chapter_id,
          c.book_id,
          c.chapter_number,
          b.name as book_name,
          (b.name || ' ' || c.chapter_number) as title,
          COALESCE(vc.verse_count, 0) as verse_count,
          CASE 
            WHEN COALESCE(vc.verse_count, 0) > 0 
            THEN ('1-' || vc.verse_count) 
            ELSE '1' 
          END as verse_range,
          COALESCE(mf_counts.media_file_count, 0) as media_file_count,
          COALESCE(mfd_counts.downloaded_count, 0) as downloaded_file_count,
          COALESCE(dln.total_downloaded_bytes, 0) as total_downloaded_bytes,
          COALESCE(dln.total_file_size_bytes, 0) as total_file_size_bytes,
          CASE 
            WHEN COALESCE(dln.total_file_size_bytes,0) > 0 
            THEN CAST(COALESCE(dln.total_downloaded_bytes,0) AS REAL) / CAST(dln.total_file_size_bytes AS REAL)
            ELSE 0
          END as download_progress_ratio
        FROM chapters c
        INNER JOIN books b ON c.book_id = b.id
        LEFT JOIN (
          SELECT chapter_id, COUNT(1) as verse_count 
          FROM verses 
          GROUP BY chapter_id
        ) vc ON vc.chapter_id = c.id
        LEFT JOIN (
          SELECT chapter_id, COUNT(1) as media_file_count
          FROM media_files
          WHERE deleted_at IS NULL AND audio_version_id = ?
          GROUP BY chapter_id
        ) mf_counts ON mf_counts.chapter_id = c.id
        LEFT JOIN (
          SELECT mf.chapter_id, COUNT(1) as downloaded_count
          FROM media_files mf
          INNER JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
          WHERE mf.deleted_at IS NULL 
            AND mfd.download_status = 'completed' 
            AND mf.audio_version_id = ?
          GROUP BY mf.chapter_id
        ) mfd_counts ON mfd_counts.chapter_id = c.id
        LEFT JOIN (
          SELECT mf.chapter_id,
                 SUM(COALESCE(mfd.downloaded_bytes,0)) AS total_downloaded_bytes,
                 SUM(COALESCE(mfd.file_size_bytes,0)) AS total_file_size_bytes
          FROM media_files mf
          LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
          WHERE mf.deleted_at IS NULL AND mf.audio_version_id = ?
          GROUP BY mf.chapter_id
        ) dln ON dln.chapter_id = c.id
        WHERE c.id = ?
      `,
        [audioVersionId, audioVersionId, audioVersionId, chapterId]
      );

      if (!result) {
        return null;
      }

      return {
        chapterId: result.chapter_id,
        audioVersionId,
        bookId: result.book_id,
        chapterNumber: result.chapter_number,
        bookName: result.book_name,
        title: result.title,
        verseCount: result.verse_count,
        verseRange: result.verse_range,
        mediaFileCount: result.media_file_count,
        downloadedFileCount: result.downloaded_file_count,
        totalDownloadedBytes: result.total_downloaded_bytes,
        totalFileSizeBytes: result.total_file_size_bytes,
        downloadProgressRatio: result.download_progress_ratio,
      };
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error computing chapter metadata:', error);
      return null;
    }
  }

  /**
   * Store computed metadata in the fast lookup table
   */
  private async storeMetadata(metadata: ChapterMetadataInput): Promise<void> {
    try {
      await powerSyncSystem.execute(
        `
        INSERT OR REPLACE INTO chapter_metadata 
        (chapter_id, audio_version_id, book_id, chapter_number, book_name, title,
         verse_count, verse_range, media_file_count, downloaded_file_count,
         total_downloaded_bytes, total_file_size_bytes, download_progress_ratio, last_updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          metadata.chapterId,
          metadata.audioVersionId,
          metadata.bookId,
          metadata.chapterNumber,
          metadata.bookName,
          metadata.title,
          metadata.verseCount,
          metadata.verseRange,
          metadata.mediaFileCount,
          metadata.downloadedFileCount,
          metadata.totalDownloadedBytes,
          metadata.totalFileSizeBytes,
          metadata.downloadProgressRatio,
          new Date().toISOString(),
        ]
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error storing chapter metadata:', error);
      throw error;
    }
  }

  /**
   * Process the update queue in batches
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const updates = Array.from(this.updateQueue);
      this.updateQueue.clear();

      logger.debug(
        ENABLE_LOGGING,
        'Processing metadata updates:',
        updates.length
      );

      // Process updates in parallel (but limit concurrency)
      const batchSize = 5;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        await Promise.all(
          batch.map(key => {
            const [chapterId, audioVersionId] = key.split('_');
            if (!audioVersionId) {
              throw new Error(`Invalid key format: ${key}`);
            }
            return this.computeAndStoreMetadata(
              chapterId as string,
              audioVersionId as string
            );
          })
        );
      }
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error processing update queue:', error);
    } finally {
      this.isProcessing = false;

      // Process any new updates that came in while we were processing
      if (this.updateQueue.size > 0) {
        setTimeout(() => this.processUpdateQueue(), 100);
      }
    }
  }

  /**
   * Clean up stale metadata (older than specified days)
   */
  async cleanupStaleMetadata(daysOld: number = 30): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      const result = await powerSyncSystem.execute(
        `DELETE FROM chapter_metadata WHERE last_updated_at < ?`,
        [cutoffISO]
      );

      logger.info(ENABLE_LOGGING, 'Cleaned up stale metadata:', result.changes);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error cleaning up stale metadata:', error);
    }
  }

  /**
   * Clear all metadata for a specific audio version (when version is removed)
   */
  async clearMetadataForVersion(audioVersionId: string): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        return;
      }

      const result = await powerSyncSystem.execute(
        `DELETE FROM chapter_metadata WHERE audio_version_id = ?`,
        [audioVersionId]
      );

      logger.info(ENABLE_LOGGING, 'Cleared metadata for version:', {
        audioVersionId,
        deletedCount: result.changes,
      });
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error clearing metadata for version:',
        error
      );
    }
  }
}

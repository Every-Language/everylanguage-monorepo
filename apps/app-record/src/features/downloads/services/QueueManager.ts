import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { generateUUID } from '@/shared/utils/uuid';
import { logger } from '@/shared/utils/logger';
import { useDownloadsStore } from '@/shared/store/downloadsStore';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Handles download queue management and prioritization
 */
export class QueueManager {
  private recomputing = false;
  private recomputePending = false;

  async recomputeQueue(): Promise<void> {
    if (this.recomputing) {
      this.recomputePending = true;
      return;
    }
    this.recomputing = true;

    try {
      const avRows = await powerSyncSystem.getAll(
        `SELECT audio_version_id FROM user_saved_audio_versions_downloads`
      );
      const audioVersionIds = (
        avRows as Array<{ audio_version_id: string }>
      ).map(r => r.audio_version_id);

      if (audioVersionIds.length === 0) {
        return;
      }

      const placeholders = audioVersionIds.map(() => '?').join(',');
      const rows = await powerSyncSystem.getAll(
        `SELECT id as media_file_id, file_size as file_size_bytes
         FROM media_files
         WHERE audio_version_id IN (${placeholders}) AND object_key IS NOT NULL AND object_key <> '' AND deleted_at IS NULL`,
        audioVersionIds
      );

      let enqueued = 0;
      for (const row of rows as Array<{
        media_file_id: string;
        file_size_bytes: number | null;
      }>) {
        const priority = 10;

        await powerSyncSystem.execute(
          `INSERT INTO download_queue (
            id, media_file_id, file_size_bytes, priority, enqueued_at, status
          )
          SELECT ?, ?, ?, ?, ?, 'queued'
          WHERE NOT EXISTS (
            SELECT 1 FROM media_files_downloads WHERE media_file_id = ? AND download_status = 'completed'
          )
          AND NOT EXISTS (
            SELECT 1 FROM download_queue WHERE media_file_id = ? AND status IN ('queued','active','paused')
          )`,
          [
            generateUUID(),
            row.media_file_id,
            row.file_size_bytes ?? null,
            priority,
            new Date().toISOString(),
            row.media_file_id,
            row.media_file_id,
          ]
        );
        enqueued++;
      }

      // Clean up duplicates
      await powerSyncSystem.execute(
        `DELETE FROM download_queue
         WHERE status = 'queued' AND id NOT IN (
           SELECT MIN(id) FROM download_queue WHERE status = 'queued' GROUP BY media_file_id
         )`
      );

      const postQueueCount = await powerSyncSystem.getAll(
        `SELECT 
           SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS queued,
           SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active
         FROM download_queue`
      );

      logger.info(ENABLE_LOGGING, 'Downloads: enqueue result', {
        newlyEnqueued: enqueued,
        queued: Number(postQueueCount[0]?.queued ?? 0),
        active: Number(postQueueCount[0]?.active ?? 0),
      });

      useDownloadsStore.getState().refreshCounts();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to recompute download queue:',
        error
      );
    } finally {
      this.recomputing = false;
      if (this.recomputePending) {
        this.recomputePending = false;
        void this.recomputeQueue();
      }
    }
  }

  async prioritizeChapterDownloads(chapterId: string): Promise<void> {
    if (!chapterId || !powerSyncSystem.isInitialized) return;

    const mediaRows = await powerSyncSystem.getAll(
      `SELECT id as media_file_id, file_size as file_size_bytes
       FROM media_files
       WHERE chapter_id = ? AND object_key IS NOT NULL AND object_key <> '' AND deleted_at IS NULL`,
      [chapterId]
    );

    const ts = new Date().toISOString();

    for (const row of mediaRows as Array<{
      media_file_id: string;
      file_size_bytes: number | null;
    }>) {
      const completed = await powerSyncSystem.getAll(
        `SELECT 1 FROM media_files_downloads WHERE media_file_id = ? AND download_status = 'completed' LIMIT 1`,
        [row.media_file_id]
      );
      if (completed.length > 0) continue;

      // Update existing queued items to high priority
      await powerSyncSystem.execute(
        `UPDATE download_queue
         SET priority = 1000, enqueued_at = CASE WHEN enqueued_at IS NULL THEN ? ELSE enqueued_at END
         WHERE media_file_id = ? AND status IN ('queued','paused')`,
        [ts, row.media_file_id]
      );

      // Insert new high-priority items if not already queued
      await powerSyncSystem.execute(
        `INSERT INTO download_queue (
           id, media_file_id, file_size_bytes, priority, enqueued_at, status
         )
         SELECT ?, ?, ?, 1000, ?, 'queued'
         WHERE NOT EXISTS (
           SELECT 1 FROM download_queue WHERE media_file_id = ? AND status IN ('queued','active','paused')
         )`,
        [
          generateUUID(),
          row.media_file_id,
          row.file_size_bytes ?? null,
          ts,
          row.media_file_id,
        ]
      );
    }
  }

  async prioritizeMediaFile(mediaFileId: string): Promise<void> {
    if (!mediaFileId) return;
    const ts = new Date().toISOString();

    await powerSyncSystem.execute(
      `UPDATE download_queue SET priority = 1000, enqueued_at = COALESCE(enqueued_at, ?) WHERE media_file_id = ? AND status IN ('queued','paused')`,
      [ts, mediaFileId]
    );

    await powerSyncSystem.execute(
      `INSERT INTO download_queue (id, media_file_id, file_size_bytes, priority, enqueued_at, status)
       SELECT ?, mf.id, mf.file_size, 1000, ?, 'queued'
       FROM media_files mf
       WHERE mf.id = ? AND mf.object_key IS NOT NULL AND mf.object_key <> ''
       AND NOT EXISTS (
         SELECT 1 FROM download_queue dq WHERE dq.media_file_id = mf.id AND dq.status IN ('queued','active','paused')
       )
       AND NOT EXISTS (
         SELECT 1 FROM media_files_downloads mfd WHERE mfd.media_file_id = mf.id AND mfd.download_status = 'completed'
       )`,
      [generateUUID(), ts, mediaFileId]
    );
  }
}

export const queueManager = new QueueManager();

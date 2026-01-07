import * as FileSystem from 'expo-file-system';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { queueManager } from './QueueManager';
import { downloadManager } from './DownloadManager';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

class ChapterDownloadService {
  /** Prioritize downloads for a single chapter and kick the manager */
  async prioritizeChapterDownloads(chapterId: string): Promise<void> {
    if (!chapterId) return;
    try {
      await queueManager.prioritizeChapterDownloads(chapterId);
      await downloadManager.kick();
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'ChapterDownloadService.prioritizeChapterDownloads failed',
        e
      );
      throw e;
    }
  }

  /** Remove downloaded files and records for a single chapter */
  async removeChapterDownloads(chapterId: string): Promise<void> {
    if (!chapterId) return;
    try {
      // Collect local file paths to delete
      const filePaths = (await powerSyncSystem.getAll(
        `SELECT mfd.local_file_path
         FROM media_files_downloads mfd
         JOIN media_files mf ON mf.id = mfd.media_file_id
         WHERE mf.chapter_id = ? AND mfd.local_file_path IS NOT NULL`,
        [chapterId]
      )) as Array<{ local_file_path: string | null }>;

      // Remove DB rows for this chapter
      await powerSyncSystem.execute(
        `DELETE FROM media_files_downloads WHERE media_file_id IN (
           SELECT id FROM media_files WHERE chapter_id = ?
         )`,
        [chapterId]
      );
      await powerSyncSystem.execute(
        `DELETE FROM download_queue WHERE media_file_id IN (
           SELECT id FROM media_files WHERE chapter_id = ?
         )`,
        [chapterId]
      );

      // Best-effort file deletion
      const base =
        FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      for (const row of filePaths) {
        const rel = row.local_file_path || '';
        if (!rel) continue;
        const abs = rel.startsWith(base) ? rel : `${base}${rel}`;
        try {
          const info = await FileSystem.getInfoAsync(abs);
          if (info.exists)
            await FileSystem.deleteAsync(abs, { idempotent: true });
        } catch (err) {
          logger.warn(
            ENABLE_LOGGING,
            'ChapterDownloadService: failed to delete file',
            err
          );
        }
      }
    } catch (e) {
      logger.warn(
        ENABLE_LOGGING,
        'ChapterDownloadService.removeChapterDownloads failed',
        e
      );
      throw e;
    }
  }
}

export const chapterDownloadService = new ChapterDownloadService();
export default ChapterDownloadService;

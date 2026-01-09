import * as FileSystem from 'expo-file-system';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import {
  getMediaSignedUrlsById,
  maybeGetCachedMediaSignedUrl,
  cacheMediaSignedUrl,
} from './urlCache';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Handles streaming URL resolution for media files
 */
export class StreamingResolver {
  async resolveStreamingUrlForChapter(
    chapterId: string
  ): Promise<{ url: string; mediaFileId: string } | null> {
    if (!powerSyncSystem.isInitialized) return null;

    try {
      const rows = await powerSyncSystem.getAll(
        `SELECT mf.id as media_file_id, mfd.local_file_path, mfd.download_status
         FROM media_files mf
         LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
         WHERE mf.chapter_id = ? AND mf.object_key IS NOT NULL AND mf.object_key <> ''
         ORDER BY mf.id ASC
         LIMIT 1`,
        [chapterId]
      );

      const row = (rows[0] || null) as {
        media_file_id?: string;
        local_file_path?: string;
        download_status?: string;
      } | null;

      if (!row?.media_file_id) return null;

      // Check if file is downloaded locally first
      if (row.download_status === 'completed' && row.local_file_path) {
        // Convert relative path to absolute path for file:// URL
        const base =
          FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
        const absolutePath = row.local_file_path.startsWith(base)
          ? row.local_file_path
          : `${base}${row.local_file_path}`;
        return { url: absolutePath, mediaFileId: row.media_file_id };
      }

      // Try cached signed URL
      const cached = await maybeGetCachedMediaSignedUrl(row.media_file_id);
      if (cached) return { url: cached, mediaFileId: row.media_file_id };

      // Generate fresh signed URL
      const signedMap = await getMediaSignedUrlsById([row.media_file_id]);
      const url = signedMap[row.media_file_id];
      if (url) {
        await cacheMediaSignedUrl(row.media_file_id, url, 6);
        return { url, mediaFileId: row.media_file_id };
      }

      return null;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error resolving streaming URL for chapter:',
        error
      );
      return null;
    }
  }
}

export const streamingResolver = new StreamingResolver();

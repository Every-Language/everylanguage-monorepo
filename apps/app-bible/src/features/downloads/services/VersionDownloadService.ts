import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { generateUUID } from '@/shared/utils/uuid';
import { logger } from '@/shared/utils/logger';
import * as FileSystem from 'expo-file-system';
import { queueManager } from './QueueManager';
import { downloadManager } from './DownloadManager';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface VersionDownloadStatus {
  isDownloadEnabled: boolean;
  totalFiles: number;
  downloadedFiles: number;
  isActivelyDownloading: boolean;
  downloadProgress: number; // 0-1
}

export class VersionDownloadService {
  private static instance: VersionDownloadService;

  public static getInstance(): VersionDownloadService {
    if (!VersionDownloadService.instance) {
      VersionDownloadService.instance = new VersionDownloadService();
    }
    return VersionDownloadService.instance;
  }

  /**
   * Get download status for a specific audio version
   */
  async getVersionDownloadStatus(
    versionId: string
  ): Promise<VersionDownloadStatus> {
    if (!powerSyncSystem.isInitialized) {
      return {
        isDownloadEnabled: false,
        totalFiles: 0,
        downloadedFiles: 0,
        isActivelyDownloading: false,
        downloadProgress: 0,
      };
    }

    try {
      const query = `
        SELECT 
          COUNT(mf.id) as total_files,
          COUNT(CASE WHEN mfd.download_status = 'completed' THEN 1 END) as downloaded_files,
          COUNT(CASE WHEN dq.status = 'active' THEN 1 END) as active_downloads,
          CASE WHEN usavd.audio_version_id IS NOT NULL THEN 1 ELSE 0 END as download_enabled
        FROM audio_versions av
        LEFT JOIN media_files mf ON mf.audio_version_id = av.id AND mf.deleted_at IS NULL
        LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
        LEFT JOIN download_queue dq ON dq.media_file_id = mf.id AND dq.status = 'active'
        LEFT JOIN user_saved_audio_versions_downloads usavd ON usavd.audio_version_id = av.id
        WHERE av.id = ? AND av.deleted_at IS NULL
        GROUP BY av.id, usavd.audio_version_id
      `;

      const results = await powerSyncSystem.getAll(query, [versionId]);
      const row = results[0];

      if (!row) {
        return {
          isDownloadEnabled: false,
          totalFiles: 0,
          downloadedFiles: 0,
          isActivelyDownloading: false,
          downloadProgress: 0,
        };
      }

      const totalFiles = Number(row.total_files ?? 0);
      const downloadedFiles = Number(row.downloaded_files ?? 0);
      const progress = totalFiles > 0 ? downloadedFiles / totalFiles : 0;

      return {
        isDownloadEnabled: Boolean(row.download_enabled),
        totalFiles,
        downloadedFiles,
        isActivelyDownloading: Number(row.active_downloads ?? 0) > 0,
        downloadProgress: progress,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error getting version download status:',
        error
      );
      return {
        isDownloadEnabled: false,
        totalFiles: 0,
        downloadedFiles: 0,
        isActivelyDownloading: false,
        downloadProgress: 0,
      };
    }
  }

  /**
   * Enable downloads for an audio version
   */
  async enableVersionDownload(versionId: string): Promise<void> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync not initialized');
    }

    try {
      // Add to user_saved_audio_versions_downloads
      await powerSyncSystem.execute(
        `INSERT INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at)
         SELECT ?, ?, ? WHERE NOT EXISTS (
           SELECT 1 FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?
         )`,
        [generateUUID(), versionId, new Date().toISOString(), versionId]
      );

      // Trigger queue recomputation and start downloads
      await queueManager.recomputeQueue();
      await downloadManager.kick();

      logger.info(ENABLE_LOGGING, 'Enabled downloads for version:', versionId);
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error enabling version download:', error);
      throw error;
    }
  }

  /**
   * Disable downloads for an audio version and clean up files
   */
  async disableVersionDownload(versionId: string): Promise<void> {
    if (!powerSyncSystem.isInitialized) {
      throw new Error('PowerSync not initialized');
    }

    try {
      // Get file paths before deletion for cleanup
      const filePathsQuery = `
        SELECT mfd.local_file_path 
        FROM media_files_downloads mfd
        JOIN media_files mf ON mfd.media_file_id = mf.id
        WHERE mf.audio_version_id = ? AND mfd.local_file_path IS NOT NULL
      `;
      const filePaths = await powerSyncSystem.getAll(filePathsQuery, [
        versionId,
      ]);

      // Remove from download versions table
      await powerSyncSystem.execute(
        `DELETE FROM user_saved_audio_versions_downloads WHERE audio_version_id = ?`,
        [versionId]
      );

      // Remove download records
      await powerSyncSystem.execute(
        `DELETE FROM media_files_downloads WHERE media_file_id IN (
           SELECT id FROM media_files WHERE audio_version_id = ?
         )`,
        [versionId]
      );

      // Remove from download queue
      await powerSyncSystem.execute(
        `DELETE FROM download_queue WHERE media_file_id IN (
           SELECT id FROM media_files WHERE audio_version_id = ?
         )`,
        [versionId]
      );

      // Delete actual files from filesystem
      for (const row of filePaths as Array<{ local_file_path: string }>) {
        try {
          const filePath = row.local_file_path;
          if (filePath) {
            // Convert relative path to absolute path for file operations
            const base =
              FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
            const absolutePath = filePath.startsWith(base)
              ? filePath
              : `${base}${filePath}`;

            const fileInfo = await FileSystem.getInfoAsync(absolutePath);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(absolutePath);
            }
          }
        } catch (fileError) {
          logger.warn(ENABLE_LOGGING, 'Failed to delete file:', fileError);
          // Continue with other files
        }
      }

      // Trigger queue recomputation and update counts
      await queueManager.recomputeQueue();

      logger.info(
        ENABLE_LOGGING,
        'Disabled downloads for version and cleaned up files:',
        versionId
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error disabling version download:', error);
      throw error;
    }
  }

  /**
   * Toggle download status for an audio version
   */
  async toggleVersionDownload(versionId: string): Promise<boolean> {
    const status = await this.getVersionDownloadStatus(versionId);

    if (status.isDownloadEnabled) {
      await this.disableVersionDownload(versionId);
      return false;
    } else {
      await this.enableVersionDownload(versionId);
      return true;
    }
  }

  /**
   * Get download status for multiple versions (optimized batch query)
   */
  async getBatchVersionDownloadStatus(
    versionIds: string[]
  ): Promise<Record<string, VersionDownloadStatus>> {
    if (!powerSyncSystem.isInitialized || versionIds.length === 0) {
      return {};
    }

    try {
      const placeholders = versionIds.map(() => '?').join(',');
      const query = `
        SELECT 
          av.id as version_id,
          COUNT(mf.id) as total_files,
          COUNT(CASE WHEN mfd.download_status = 'completed' THEN 1 END) as downloaded_files,
          COUNT(CASE WHEN dq.status = 'active' THEN 1 END) as active_downloads,
          CASE WHEN usavd.audio_version_id IS NOT NULL THEN 1 ELSE 0 END as download_enabled
        FROM audio_versions av
        LEFT JOIN media_files mf ON mf.audio_version_id = av.id AND mf.deleted_at IS NULL
        LEFT JOIN media_files_downloads mfd ON mfd.media_file_id = mf.id
        LEFT JOIN download_queue dq ON dq.media_file_id = mf.id AND dq.status = 'active'
        LEFT JOIN user_saved_audio_versions_downloads usavd ON usavd.audio_version_id = av.id
        WHERE av.id IN (${placeholders}) AND av.deleted_at IS NULL
        GROUP BY av.id, usavd.audio_version_id
      `;

      const results = await powerSyncSystem.getAll(query, versionIds);
      const statusMap: Record<string, VersionDownloadStatus> = {};

      for (const row of results as Array<{
        version_id: string;
        total_files: number;
        downloaded_files: number;
        active_downloads: number;
        download_enabled: number;
      }>) {
        const totalFiles = Number(row.total_files ?? 0);
        const downloadedFiles = Number(row.downloaded_files ?? 0);
        const progress = totalFiles > 0 ? downloadedFiles / totalFiles : 0;

        statusMap[row.version_id] = {
          isDownloadEnabled: Boolean(row.download_enabled),
          totalFiles,
          downloadedFiles,
          isActivelyDownloading: Number(row.active_downloads ?? 0) > 0,
          downloadProgress: progress,
        };
      }

      // Fill in missing versions with default status
      for (const versionId of versionIds) {
        if (!statusMap[versionId]) {
          statusMap[versionId] = {
            isDownloadEnabled: false,
            totalFiles: 0,
            downloadedFiles: 0,
            isActivelyDownloading: false,
            downloadProgress: 0,
          };
        }
      }

      return statusMap;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error getting batch version download status:',
        error
      );
      return {};
    }
  }
}

export const versionDownloadService = VersionDownloadService.getInstance();

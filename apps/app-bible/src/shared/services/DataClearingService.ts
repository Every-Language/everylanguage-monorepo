import { logger } from '../utils/logger';
import { powerSyncSystem } from './powersync/PowerSyncSystem';
import * as FileSystem from 'expo-file-system';
import { useVersionsStore } from '../../features/languages/store/versionsStore';
import { useDownloadsStore } from '../store/downloadsStore';
import { useDownloadActivityStore } from '../store/downloadActivityStore';
import { useHistoryStore } from '../../features/media/store/HistoryStore';
import { useSessionStore } from '../../features/media/store/SessionStore';
import { useBibleNavigationStore } from '../../features/bible/store/bibleNavigationStore';
import { useMediaPlayerUIStore } from '../../features/media/store/MediaPlayerUIStore';
import { usePlaybackStore } from '../../features/media/store/PlaybackStore';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Service responsible for completely clearing all user data, downloads, and local files
 * This ensures a true clean slate when resetting the app
 */
class DataClearingService {
  private static instance: DataClearingService;

  public static getInstance(): DataClearingService {
    if (!DataClearingService.instance) {
      DataClearingService.instance = new DataClearingService();
    }
    return DataClearingService.instance;
  }

  /**
   * Completely clear all user data, downloads, and local files
   */
  public async clearAllData(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🧹 DataClearingService: Starting complete data clearing...'
      );

      // 1. Clear all downloaded files from filesystem
      await this.clearAllDownloadedFiles();

      // 2. Clear all database tables
      await this.clearAllDatabaseTables();

      // 3. Clear play history using HistoryManager
      await this.clearPlayHistory();

      // 4. Clear all store states
      await this.clearAllStoreStates();

      // 5. Clear file system cache and temporary files
      await this.clearFileSystemCache();

      logger.info(
        ENABLE_LOGGING,
        '✅ DataClearingService: Complete data clearing finished'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '💥 DataClearingService: Data clearing failed:',
        error
      );
      throw error;
    }
  }

  /**
   * Clear all downloaded audio and image files from the filesystem
   */
  private async clearAllDownloadedFiles(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🗑️ Clearing all downloaded files...');

      if (!powerSyncSystem.isInitialized) {
        logger.warn(
          ENABLE_LOGGING,
          'PowerSync not initialized, skipping file clearing'
        );
        return;
      }

      // Get all downloaded file paths from database
      let filePaths: Array<{ local_file_path: string }> = [];
      let imagePaths: Array<{ local_file_path: string }> = [];

      try {
        filePaths = (await powerSyncSystem.getAll(
          `SELECT DISTINCT local_file_path 
           FROM media_files_downloads 
           WHERE local_file_path IS NOT NULL`
        )) as Array<{ local_file_path: string }>;
      } catch (error) {
        logger.warn(ENABLE_LOGGING, 'Failed to get media file paths:', error);
      }

      try {
        imagePaths = (await powerSyncSystem.getAll(
          `SELECT DISTINCT local_file_path 
           FROM images_downloads 
           WHERE local_file_path IS NOT NULL`
        )) as Array<{ local_file_path: string }>;
      } catch (error) {
        logger.warn(ENABLE_LOGGING, 'Failed to get image file paths:', error);
      }

      const allPaths = [...filePaths, ...imagePaths];
      const baseDir =
        FileSystem.documentDirectory || FileSystem.cacheDirectory || '';

      let deletedCount = 0;
      for (const row of allPaths) {
        const relativePath = row.local_file_path;
        if (!relativePath) continue;

        try {
          // Convert relative path to absolute path
          const absolutePath = relativePath.startsWith(baseDir)
            ? relativePath
            : `${baseDir}${relativePath}`;

          const fileInfo = await FileSystem.getInfoAsync(absolutePath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(absolutePath, { idempotent: true });
            deletedCount++;
          }
        } catch (fileError) {
          logger.warn(
            ENABLE_LOGGING,
            'Failed to delete file:',
            relativePath,
            fileError
          );
        }
      }

      logger.info(
        ENABLE_LOGGING,
        `✅ Deleted ${deletedCount} downloaded files`
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '❌ Failed to clear downloaded files:',
        error
      );
      throw error;
    }
  }

  /**
   * Clear play history using HistoryManager service
   */
  private async clearPlayHistory(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🎵 Clearing play history...');

      // Import and use HistoryManager service
      const { historyManager } =
        await import('@/features/media/services/HistoryManager');
      await historyManager.clearHistory();

      logger.info(ENABLE_LOGGING, '✅ Cleared play history');
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '⚠️ Failed to clear play history (non-fatal):',
        error
      );
      // Don't throw - play history clearing failure shouldn't block the entire reset
    }
  }

  /**
   * Clear all database tables (both user data and download data)
   */
  private async clearAllDatabaseTables(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🗄️ Clearing all database tables...');

      if (!powerSyncSystem.isInitialized) {
        logger.warn(
          ENABLE_LOGGING,
          'PowerSync not initialized, skipping database clearing'
        );
        return;
      }

      // Check if there's any data to clear first
      const hasData = await this.checkIfDatabaseHasData();
      if (!hasData) {
        logger.info(
          ENABLE_LOGGING,
          '📭 Database is empty, skipping clearing operations'
        );
        return;
      }

      // Clear all user data tables
      const userDataTables = [
        'user_bookmarks',
        'user_bookmark_folders',
        'user_saved_image_sets',
        'user_playlists',
        'user_playlist_groups',
        'user_saved_audio_versions',
        'user_saved_text_versions',
        'user_current_selections',
        'user_saved_audio_versions_downloads',
      ];

      // Clear all download-related tables
      const downloadTables = [
        'media_files_downloads',
        'download_queue',
        'images_downloads',
        'images_download_queue',
        'user_saved_audio_versions_downloads',
        'version_language_lookup',
        'user_queue',
        'autoplay_queue',
        'play_history',
        'queue_state',
        'chapter_metadata',
      ];

      // Clear all tables in transaction
      let transactionActive = false;
      try {
        await powerSyncSystem.execute('BEGIN IMMEDIATE');
        transactionActive = true;

        // Clear user data tables
        for (const table of userDataTables) {
          try {
            await powerSyncSystem.execute(`DELETE FROM ${table}`);
          } catch (error) {
            logger.warn(
              ENABLE_LOGGING,
              `Failed to clear table ${table}:`,
              error
            );
            // Continue with other tables even if one fails
          }
        }

        // Clear download tables
        for (const table of downloadTables) {
          try {
            await powerSyncSystem.execute(`DELETE FROM ${table}`);
          } catch (error) {
            logger.warn(
              ENABLE_LOGGING,
              `Failed to clear table ${table}:`,
              error
            );
            // Continue with other tables even if one fails
          }
        }

        await powerSyncSystem.execute('COMMIT');
        transactionActive = false;
        logger.info(ENABLE_LOGGING, '✅ Cleared all database tables');
      } catch (error) {
        if (transactionActive) {
          try {
            await powerSyncSystem.execute('ROLLBACK');
          } catch (rollbackError) {
            logger.warn(
              ENABLE_LOGGING,
              '⚠️ Failed to rollback transaction (non-fatal):',
              rollbackError
            );
            // Don't throw rollback errors - they're often harmless
          }
        }
        throw error;
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '❌ Failed to clear database tables:',
        error
      );
      throw error;
    }
  }

  /**
   * Check if database has any data that needs clearing
   */
  private async checkIfDatabaseHasData(): Promise<boolean> {
    try {
      // Check a few key tables to see if there's any data
      const checkTables = [
        'user_bookmarks',
        'user_playlists',
        'media_files_downloads',
        'play_history',
        'user_saved_audio_versions',
        'user_saved_text_versions',
      ];

      for (const table of checkTables) {
        try {
          const result = await powerSyncSystem.getAll(
            `SELECT COUNT(*) as count FROM ${table} LIMIT 1`
          );
          if (result && result.length > 0 && result[0].count > 0) {
            logger.info(
              ENABLE_LOGGING,
              `📊 Found data in ${table} (${result[0].count} records)`
            );
            return true;
          }
        } catch (error) {
          // Table might not exist or be empty, continue checking
          logger.debug(
            ENABLE_LOGGING,
            `Table ${table} check failed (likely empty):`,
            error
          );
        }
      }

      logger.info(ENABLE_LOGGING, '📭 No data found in any checked tables');
      return false;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '⚠️ Failed to check database data (assuming empty):',
        error
      );
      // If we can't check, assume empty to avoid unnecessary operations
      return false;
    }
  }

  /**
   * Clear all store states to initial values
   */
  private async clearAllStoreStates(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🏪 Clearing all store states...');

      // Clear versions store (reset to no versions selected)
      // Don't call authenticated methods during sign-out - directly reset state
      useVersionsStore.setState({
        currentAudioVersion: null,
        currentTextVersion: null,
        savedAudioVersions: [],
        savedTextVersions: [],
        isReady: false,
        error: null,
      });

      // Clear bible navigation store (reset to books screen)
      const bibleNavigationStore = useBibleNavigationStore.getState();
      bibleNavigationStore.reset();

      // Clear media player UI store
      const mediaPlayerUIStore = useMediaPlayerUIStore.getState();
      mediaPlayerUIStore.setExpanded(false);

      // Clear playback store
      try {
        const playbackStore = usePlaybackStore.getState();
        await playbackStore.stop();
        playbackStore.clearError();
      } catch (error) {
        logger.warn(
          ENABLE_LOGGING,
          'Failed to stop playback store (non-fatal):',
          error
        );
        // Continue with reset even if playback stop fails
      }

      // Clear downloads store
      try {
        const downloadsStore = useDownloadsStore.getState();
        await downloadsStore.refreshCounts();
      } catch (error) {
        logger.warn(
          ENABLE_LOGGING,
          'Failed to refresh downloads counts (non-fatal):',
          error
        );
        // Reset to zero counts manually if refresh fails
        useDownloadsStore.setState({
          queued: 0,
          active: 0,
          completed: 0,
          failed: 0,
          fileStats: {
            totalCompleted: 0,
            totalFailed: 0,
          },
        });
      }

      // Clear download activity store
      const downloadActivityStore = useDownloadActivityStore.getState();
      // Reset all resolving states
      const resolvingStates = Object.keys(
        downloadActivityStore.resolvingByChapterId
      );
      for (const chapterId of resolvingStates) {
        downloadActivityStore.clearResolving(chapterId);
      }

      // Clear play history stores
      const historyStore = useHistoryStore.getState();
      historyStore.clearHistoryStacks();

      const sessionStore = useSessionStore.getState();
      sessionStore.clearExpiredSession();

      logger.info(ENABLE_LOGGING, '✅ Cleared all store states');
    } catch (error) {
      logger.error(ENABLE_LOGGING, '❌ Failed to clear store states:', error);
      throw error;
    }
  }

  /**
   * Clear file system cache and temporary files
   */
  private async clearFileSystemCache(): Promise<void> {
    try {
      logger.info(ENABLE_LOGGING, '🗂️ Clearing file system cache...');

      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        try {
          const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
          if (cacheInfo.exists && cacheInfo.isDirectory) {
            // Clear cache directory contents
            const cacheContents = await FileSystem.readDirectoryAsync(cacheDir);
            for (const item of cacheContents) {
              const itemPath = `${cacheDir}${item}`;
              const itemInfo = await FileSystem.getInfoAsync(itemPath);
              if (itemInfo.exists) {
                if (itemInfo.isDirectory) {
                  await FileSystem.deleteAsync(itemPath, { idempotent: true });
                } else {
                  await FileSystem.deleteAsync(itemPath, { idempotent: true });
                }
              }
            }
          }
        } catch (cacheError) {
          logger.warn(
            ENABLE_LOGGING,
            'Failed to clear cache directory:',
            cacheError
          );
        }
      }

      logger.info(ENABLE_LOGGING, '✅ Cleared file system cache');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '❌ Failed to clear file system cache:',
        error
      );
      // Don't throw - cache clearing failure shouldn't block the entire reset
    }
  }

  /**
   * Clear only user data while preserving downloaded content
   * Used for scenarios where we want to reset user preferences but keep downloads
   */
  public async clearUserDataOnly(): Promise<void> {
    try {
      logger.info(
        ENABLE_LOGGING,
        '🧹 DataClearingService: Clearing user data only...'
      );

      // Clear user data tables only
      await this.clearUserDataTables();

      // Clear play history
      await this.clearPlayHistory();

      // Clear store states
      await this.clearAllStoreStates();

      logger.info(
        ENABLE_LOGGING,
        '✅ DataClearingService: User data clearing completed'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '💥 DataClearingService: User data clearing failed:',
        error
      );
      throw error;
    }
  }

  /**
   * Clear only user data tables (preserves downloads)
   */
  private async clearUserDataTables(): Promise<void> {
    try {
      if (!powerSyncSystem.isInitialized) {
        logger.warn(
          ENABLE_LOGGING,
          'PowerSync not initialized, skipping user data clearing'
        );
        return;
      }

      // Check if there's any user data to clear first
      const hasUserData = await this.checkIfUserDataExists();
      if (!hasUserData) {
        logger.info(
          ENABLE_LOGGING,
          '📭 No user data found, skipping user data clearing'
        );
        return;
      }

      const userDataTables = [
        'user_bookmarks',
        'user_bookmark_folders',
        'user_saved_image_sets',
        'user_playlists',
        'user_playlist_groups',
        'user_saved_audio_versions',
        'user_saved_text_versions',
        'user_current_selections',
        'user_saved_audio_versions_downloads',
      ];

      let transactionActive = false;
      try {
        await powerSyncSystem.execute('BEGIN IMMEDIATE');
        transactionActive = true;

        for (const table of userDataTables) {
          try {
            await powerSyncSystem.execute(`DELETE FROM ${table}`);
          } catch (error) {
            logger.warn(
              ENABLE_LOGGING,
              `Failed to clear user data table ${table}:`,
              error
            );
            // Continue with other tables even if one fails
          }
        }
        await powerSyncSystem.execute('COMMIT');
        transactionActive = false;
      } catch (error) {
        if (transactionActive) {
          try {
            await powerSyncSystem.execute('ROLLBACK');
          } catch (rollbackError) {
            logger.warn(
              ENABLE_LOGGING,
              '⚠️ Failed to rollback user data transaction (non-fatal):',
              rollbackError
            );
            // Don't throw rollback errors - they're often harmless
          }
        }
        throw error;
      }
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '❌ Failed to clear user data tables:',
        error
      );
      throw error;
    }
  }
  /**
   * Check if user data exists in the database
   */
  private async checkIfUserDataExists(): Promise<boolean> {
    try {
      // Check user-specific tables
      const userDataTables = [
        'user_bookmarks',
        'user_playlists',
        'user_saved_audio_versions',
        'user_saved_text_versions',
        'user_current_selections',
      ];

      for (const table of userDataTables) {
        try {
          const result = await powerSyncSystem.getAll(
            `SELECT COUNT(*) as count FROM ${table} LIMIT 1`
          );
          if (result && result.length > 0 && result[0].count > 0) {
            logger.info(
              ENABLE_LOGGING,
              `📊 Found user data in ${table} (${result[0].count} records)`
            );
            return true;
          }
        } catch (error) {
          // Table might not exist or be empty, continue checking
          logger.debug(
            ENABLE_LOGGING,
            `User data table ${table} check failed (likely empty):`,
            error
          );
        }
      }

      logger.info(
        ENABLE_LOGGING,
        '📭 No user data found in any checked tables'
      );
      return false;
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        '⚠️ Failed to check user data (assuming empty):',
        error
      );
      // If we can't check, assume empty to avoid unnecessary operations
      return false;
    }
  }
}

export const dataClearingService = DataClearingService.getInstance();

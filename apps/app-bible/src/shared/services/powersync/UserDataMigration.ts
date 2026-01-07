import { powerSyncSystem } from './PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

function ensureDbReady(): void {
  if (!powerSyncSystem.isInitialized) {
    throw new Error('PowerSync database not initialized');
  }
}

/**
 * Migrate local user-owned rows from oldUserId to newUserId.
 * Run BEFORE reconnecting PowerSync with the authenticated session to avoid out-of-scope purges.
 */
export async function migrateLocalUserOwnedData(
  oldUserId: string | null | undefined,
  newUserId: string | null | undefined
): Promise<void> {
  // Import download manager to pause downloads during migration
  const { downloadManager } =
    await import('@/features/downloads/services/DownloadManager');

  try {
    ensureDbReady();

    if (!oldUserId || !newUserId || oldUserId === newUserId) {
      return;
    }

    // Pause downloads to prevent race conditions (only if PowerSync is connected)
    try {
      await downloadManager.pauseForMigration();
    } catch (error) {
      // Downloads might not be running yet if PowerSync isn't connected
      logger.debug(
        ENABLE_LOGGING,
        'UserDataMigration: Could not pause downloads (PowerSync not connected yet)',
        error
      );
    }

    const start = Date.now();
    // Idempotency: mark migration as done for this pair to avoid repeat work
    try {
      await powerSyncSystem.execute(
        'CREATE TABLE IF NOT EXISTS __meta (__key TEXT PRIMARY KEY, __value TEXT)'
      );
      const key = `user_migration_v1:${oldUserId}->${newUserId}`;
      type MetaRow = { __value?: string | null } | undefined;
      const row = (await powerSyncSystem.get(
        'SELECT __value FROM __meta WHERE __key = ?',
        [key]
      )) as MetaRow;
      if (row && row.__value) {
        return;
      }
    } catch {
      // best-effort only
    }

    // Move rows into scope of the new uid to avoid client purge on reconnect.
    // Use UPDATE statements to avoid RLS policy violations
    const statements: Array<[string, unknown[]]> = [
      [
        'UPDATE user_current_selections SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_saved_audio_versions SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_saved_text_versions SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      // Add missing tables that should be migrated
      [
        'UPDATE user_bookmarks SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_bookmark_folders SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_saved_image_sets SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_playlist_groups SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      [
        'UPDATE user_playlists SET user_id = ? WHERE user_id = ?',
        [newUserId, oldUserId],
      ],
      // Migrate local-only download tables (these don't have user_id but are linked via audio_version_id)
      [
        'INSERT OR REPLACE INTO user_saved_audio_versions_downloads (id, audio_version_id, created_at) SELECT id, audio_version_id, created_at FROM user_saved_audio_versions_downloads WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?)',
        [oldUserId],
      ],
      // Migrate download queue and status tables
      [
        'INSERT OR REPLACE INTO download_queue (id, media_file_id, file_size_bytes, priority, enqueued_at, started_at, completed_at, status, error_message, signed_url, signed_url_expires_at) SELECT id, media_file_id, file_size_bytes, priority, enqueued_at, started_at, completed_at, status, error_message, signed_url, signed_url_expires_at FROM download_queue WHERE media_file_id IN (SELECT id FROM media_files WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?))',
        [oldUserId],
      ],
      [
        'INSERT OR REPLACE INTO media_files_downloads (id, media_file_id, local_file_path, download_status, progress, downloaded_bytes, file_size_bytes, error_message, priority, retry_count, last_attempt_at, downloaded_at, created_at, updated_at) SELECT id, media_file_id, local_file_path, download_status, progress, downloaded_bytes, file_size_bytes, error_message, priority, retry_count, last_attempt_at, downloaded_at, created_at, updated_at FROM media_files_downloads WHERE media_file_id IN (SELECT id FROM media_files WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?))',
        [oldUserId],
      ],
    ];

    await powerSyncSystem.execute('BEGIN IMMEDIATE');
    try {
      for (const [sql, params] of statements) {
        try {
          await powerSyncSystem.execute(sql, params);
        } catch (error) {
          // Log RLS policy violations but continue with migration
          if (
            error instanceof Error &&
            error.message.includes('row-level security policy')
          ) {
            logger.warn(
              ENABLE_LOGGING,
              'UserDataMigration: RLS policy violation for statement, skipping',
              { sql, params, error: error.message }
            );
            continue;
          }
          throw error;
        }
      }
      // Mark idempotent key
      try {
        const key = `user_migration_v1:${oldUserId}->${newUserId}`;
        await powerSyncSystem.execute(
          'INSERT OR REPLACE INTO __meta (__key, __value) VALUES (?, ?)',
          [key, new Date().toISOString()]
        );
      } catch {
        // ignore
      }
      // Clean up old data after successful migration
      const cleanupStatements: Array<[string, unknown[]]> = [
        ['DELETE FROM user_current_selections WHERE user_id = ?', [oldUserId]],
        [
          'DELETE FROM user_saved_audio_versions WHERE user_id = ?',
          [oldUserId],
        ],
        ['DELETE FROM user_saved_text_versions WHERE user_id = ?', [oldUserId]],
        ['DELETE FROM user_bookmarks WHERE user_id = ?', [oldUserId]],
        ['DELETE FROM user_bookmark_folders WHERE user_id = ?', [oldUserId]],
        ['DELETE FROM user_saved_image_sets WHERE user_id = ?', [oldUserId]],
        ['DELETE FROM user_playlist_groups WHERE user_id = ?', [oldUserId]],
        ['DELETE FROM user_playlists WHERE user_id = ?', [oldUserId]],
        // Clean up local-only download tables
        [
          'DELETE FROM user_saved_audio_versions_downloads WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?)',
          [oldUserId],
        ],
        [
          'DELETE FROM download_queue WHERE media_file_id IN (SELECT id FROM media_files WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?))',
          [oldUserId],
        ],
        [
          'DELETE FROM media_files_downloads WHERE media_file_id IN (SELECT id FROM media_files WHERE audio_version_id IN (SELECT audio_version_id FROM user_saved_audio_versions WHERE user_id = ?))',
          [oldUserId],
        ],
      ];

      for (const [sql, params] of cleanupStatements) {
        await powerSyncSystem.execute(sql, params);
      }

      await powerSyncSystem.execute('COMMIT');
    } catch (e) {
      await powerSyncSystem.execute('ROLLBACK');
      throw e;
    }

    // Verify migration success
    const verificationResults = await Promise.all([
      powerSyncSystem.get(
        'SELECT COUNT(*) as count FROM user_saved_audio_versions WHERE user_id = ?',
        [newUserId]
      ),
      powerSyncSystem.get(
        'SELECT COUNT(*) as count FROM user_saved_text_versions WHERE user_id = ?',
        [newUserId]
      ),
      powerSyncSystem.get(
        'SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = ?',
        [newUserId]
      ),
    ]);

    logger.info(
      ENABLE_LOGGING,
      'UserDataMigration: migrated local user-owned data',
      {
        oldUserId,
        newUserId,
        elapsedMs: Date.now() - start,
        migratedCounts: {
          audioVersions: verificationResults[0]?.count || 0,
          textVersions: verificationResults[1]?.count || 0,
          bookmarks: verificationResults[2]?.count || 0,
        },
      }
    );

    // Resume downloads after migration is complete (only if PowerSync is connected)
    try {
      await downloadManager.resumeAfterMigration();
    } catch (error) {
      // Downloads might not be running yet if PowerSync isn't connected
      logger.debug(
        ENABLE_LOGGING,
        'UserDataMigration: Could not resume downloads (PowerSync not connected yet)',
        error
      );
    }
  } catch (error) {
    // Resume downloads even if migration fails (only if PowerSync is connected)
    try {
      await downloadManager.resumeAfterMigration();
    } catch (resumeError) {
      // Downloads might not be running yet if PowerSync isn't connected
      logger.debug(
        ENABLE_LOGGING,
        'UserDataMigration: Could not resume downloads after error (PowerSync not connected yet)',
        resumeError
      );
    }

    logger.error(ENABLE_LOGGING, 'UserDataMigration: migration failed', error);
    throw error;
  }
}

/**
 * Purge local user-owned data on sign-out for privacy and to avoid stale UI.
 * Global content is retained.
 */
export async function purgeLocalUserOwnedData(): Promise<void> {
  try {
    ensureDbReady();

    // Order deletes to respect FKs if present; use individual deletes for clarity.
    const statements: Array<[string, unknown[]?]> = [
      ['DELETE FROM user_bookmarks'],
      ['DELETE FROM user_bookmark_folders'],
      ['DELETE FROM user_saved_image_sets'],
      ['DELETE FROM user_playlists'],
      ['DELETE FROM user_playlist_groups'],
      ['DELETE FROM user_saved_audio_versions'],
      ['DELETE FROM user_saved_text_versions'],
      ['DELETE FROM user_current_selections'],
      // Local-only derivatives
      ['DELETE FROM user_saved_audio_versions_downloads'],
    ];

    for (const [sql, params] of statements) {
      await powerSyncSystem.execute(sql, params ?? []);
    }

    logger.info(
      ENABLE_LOGGING,
      'UserDataMigration: purged local user-owned data'
    );
  } catch (error) {
    logger.error(ENABLE_LOGGING, 'UserDataMigration: purge failed', error);
    throw error;
  }
}

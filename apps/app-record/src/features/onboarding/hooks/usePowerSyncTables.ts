import { useState, useEffect } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface TableInfo {
  name: string;
  rowCount: number;
}

/**
 * Hook to get list of synced tables from PowerSync
 * Returns the first 10 synced tables (excluding local-only tables)
 */
export const usePowerSyncTables = (): {
  tables: TableInfo[];
  loading: boolean;
  error: string | null;
} => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      if (!powerSyncSystem.isInitialized) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query SQLite master table to get all tables
        const allTables = await powerSyncSystem.getAll<{ name: string }>(
          `SELECT name FROM sqlite_master 
           WHERE type='table' 
           AND name NOT LIKE 'sqlite_%'
           AND name NOT LIKE '__%'
           ORDER BY name`
        );

        // Filter out local-only tables and get row counts
        const syncedTables: TableInfo[] = [];

        // List of local-only tables to exclude
        const localOnlyTablesList = [
          'media_files_downloads',
          'download_queue',
          'user_saved_audio_versions_downloads',
          'version_language_lookup',
          'user_queue',
          'autoplay_queue',
          'play_history',
          'queue_state',
          'images_downloads',
          'images_download_queue',
          'chapter_metadata',
          '__meta', // PowerSync internal table
        ];

        for (const table of allTables.slice(0, 20)) {
          // Skip local-only tables
          if (localOnlyTablesList.includes(table.name)) {
            continue;
          }

          try {
            // Get row count for each table
            // Note: table.name is from sqlite_master, so it's safe, but we validate it's alphanumeric/underscore
            if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table.name)) {
              continue; // Skip invalid table names
            }
            const countResult = await powerSyncSystem.get<{ count: number }>(
              `SELECT COUNT(*) as count FROM "${table.name}"`
            );
            const rowCount = countResult?.count ?? 0;

            syncedTables.push({
              name: table.name,
              rowCount,
            });

            // Stop at 10 tables
            if (syncedTables.length >= 10) {
              break;
            }
          } catch (err) {
            // If we can't query the table, skip it
            logger.warn(
              ENABLE_LOGGING,
              `usePowerSyncTables: Failed to query table ${table.name}`,
              err
            );
          }
        }

        setTables(syncedTables);
      } catch (err) {
        logger.error(
          ENABLE_LOGGING,
          'usePowerSyncTables: Failed to fetch tables',
          err
        );
        setError(err instanceof Error ? err.message : 'Failed to fetch tables');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();

    // Refresh every 5 seconds to update row counts
    const interval = setInterval(fetchTables, 5000);

    return () => clearInterval(interval);
  }, []);

  return { tables, loading, error };
};

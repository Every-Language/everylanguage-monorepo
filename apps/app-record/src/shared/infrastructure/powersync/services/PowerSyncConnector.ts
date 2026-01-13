import { UpdateType, AbstractPowerSyncDatabase } from '@powersync/react-native';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/utils/logger';
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '../types';

/**
 * Read-only tables that sync DOWN from server but should NOT upload local changes.
 * These tables are managed server-side and local modifications should be ignored.
 */
const READ_ONLY_TABLES = [
  'bible_versions',
  'books',
  'chapters',
  'verses',
] as const;

/**
 * PowerSync Backend Connector
 *
 * Implements PowerSyncBackendConnector interface following PowerSync best practices.
 * Handles authentication and uploading local changes to Supabase backend.
 */
export class PowerSyncConnector implements PowerSyncBackendConnector {
  /**
   * Get credentials for connecting to PowerSync
   * Called automatically by PowerSync to refresh the connection
   */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    if (!env.powersync.url) {
      throw new Error(
        'PowerSync URL not configured. Please set EXPO_PUBLIC_POWERSYNC_RECORD_URL in your environment.'
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error('No Supabase session available for credentials');
    }

    const isAuthenticated = session?.user && !session.user.is_anonymous;

    return {
      endpoint: env.powersync.url,
      token: session.access_token,
      parameters: {
        is_authenticated: isAuthenticated ? 'true' : 'false',
      },
    };
  }

  /**
   * Upload local changes to the backend
   * Called automatically by PowerSync when there are pending local changes
   *
   * Implements batching for PUT operations and handles fatal errors per PowerSync best practices.
   * Fatal errors (e.g., invalid data, permission denied) discard the transaction to prevent
   * infinite retries. Transient errors (network, server errors) are retried automatically.
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      // Group operations by type and table for efficient batching
      const putOps: Record<string, unknown[]> = {};
      const deleteOps: Record<string, string[]> = {};
      const patchOps: Array<{
        table: string;
        id: string;
        data: Record<string, unknown>;
      }> = [];

      // Organize operations, filtering out read-only tables
      for (const op of transaction.crud) {
        // Skip read-only tables (Bible data) - these sync DOWN only
        if (
          READ_ONLY_TABLES.includes(
            op.table as (typeof READ_ONLY_TABLES)[number]
          )
        ) {
          logger.debug(
            `Skipping upload for read-only table: ${op.table} (${op.op})`
          );
          continue;
        }

        const record = { ...op.opData, id: op.id };

        switch (op.op) {
          case UpdateType.PUT:
            if (!putOps[op.table]) {
              putOps[op.table] = [];
            }
            // TypeScript doesn't understand the initialization above, use non-null assertion
            putOps[op.table]!.push(record);
            break;

          case UpdateType.PATCH: {
            const { id, ...updateData } = record;
            patchOps.push({ table: op.table, id, data: updateData });
            break;
          }

          case UpdateType.DELETE:
            if (!deleteOps[op.table]) {
              deleteOps[op.table] = [];
            }
            // TypeScript doesn't understand the initialization above, use non-null assertion
            deleteOps[op.table]!.push(op.id);
            break;
        }
      }

      // Execute bulk PUT operations (most efficient)
      // Using type assertion for dynamic table access - PowerSync handles table validation
      for (const [table, records] of Object.entries(putOps)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any)
          .from(table)
          .upsert(records, { onConflict: 'id' });

        if (result?.error) {
          logger.error(`PowerSync bulk PUT error for ${table}:`, result.error);
          throw result.error;
        }
      }

      // Execute bulk DELETE operations
      for (const [table, ids] of Object.entries(deleteOps)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any)
          .from(table)
          .delete()
          .in('id', ids);

        if (result?.error) {
          logger.error(
            `PowerSync bulk DELETE error for ${table}:`,
            result.error
          );
          throw result.error;
        }
      }

      // Execute PATCH operations individually (can't be easily batched)
      for (const { table, id, data } of patchOps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any)
          .from(table)
          .update(data)
          .eq('id', id);

        if (result?.error) {
          logger.error(`PowerSync PATCH error for ${table}:`, result.error);
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (error: unknown) {
      // Check for fatal errors that should discard the transaction
      // These typically indicate data validation issues or permission problems
      const fatalErrorCodes = [
        'PGRST116', // Not found
        '23505', // Unique violation (PostgreSQL)
        '23503', // Foreign key violation
        '42501', // Insufficient privilege
      ];

      // Type guard for error objects with code/status properties
      const hasErrorCode = (
        err: unknown
      ): err is { code: string; status?: number } => {
        return typeof err === 'object' && err !== null && 'code' in err;
      };

      const isFatalError =
        (hasErrorCode(error) && fatalErrorCodes.includes(error.code)) ||
        (typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (error.status === 400 ||
            error.status === 403 ||
            error.status === 404));

      if (isFatalError) {
        // Discard transaction to prevent infinite retries
        // These errors typically indicate bugs or invalid data
        logger.error(
          'PowerSync upload fatal error - discarding transaction:',
          error instanceof Error ? error : new Error(String(error))
        );
        await transaction.complete();
      } else {
        // Transient error (network, server error) - PowerSync will retry
        logger.warn(
          'PowerSync upload transient error - will retry:',
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    }
  }
}

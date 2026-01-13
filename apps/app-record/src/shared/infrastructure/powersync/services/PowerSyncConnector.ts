import { UpdateType, AbstractPowerSyncDatabase } from '@powersync/react-native';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { env } from '@/app/config/env';
import { logger } from '@/shared/utils/logger';
import type { PowerSyncBackendConnector, PowerSyncCredentials } from '../types';

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
   */
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    for (const op of transaction.crud) {
      const record = { ...op.opData, id: op.id };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabaseClient = supabase as any;

        switch (op.op) {
          case UpdateType.PUT:
            await supabaseClient.from(op.table).upsert(record, {
              onConflict: 'id',
            });
            break;

          case UpdateType.PATCH: {
            const { id, ...updateData } = record;
            await supabaseClient.from(op.table).update(updateData).eq('id', id);
            break;
          }

          case UpdateType.DELETE:
            await supabaseClient.from(op.table).delete().eq('id', op.id);
            break;
        }
      } catch (error) {
        // PowerSync will automatically retry on error
        // Log error but let PowerSync handle retry logic
        logger.error(
          `PowerSync upload error for ${op.table}:`,
          error instanceof Error ? error : new Error(String(error))
        );
        throw error;
      }
    }

    await transaction.complete();
  }
}

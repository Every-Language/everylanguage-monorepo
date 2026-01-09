import { UpdateType, AbstractPowerSyncDatabase } from '@powersync/react-native';
import { supabase } from '@/shared/services/api/supabase';
import { env } from '@/app/config/env';
import { logger } from '@/shared/utils/logger';
import { isUploadAllowed } from './UploadPermissions';
import { powerSyncErrorHandler } from './PowerSyncErrorHandler';
import type {
  PowerSyncBackendConnector,
  SupabaseAuthResponse,
  PowerSyncCredentials,
} from './types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * PowerSync Backend Connector
 *
 * Handles authentication with PowerSync and uploading local changes to the backend.
 * Supports both authenticated and unauthenticated users for public Bible data access.
 */
export class PowerSyncConnector implements PowerSyncBackendConnector {
  /**
   * Get credentials for connecting to PowerSync
   * Called every few minutes to refresh the connection
   *
   * @returns PowerSync credentials with authentication parameters
   */
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    try {
      // Validate PowerSync URL first
      if (!env.powersync.url) {
        throw new Error(
          'PowerSync URL not configured. Please set EXPO_PUBLIC_POWERSYNC_RECORD_URL in your environment.'
        );
      }

      // Try to get existing session first
      const {
        data: { session },
        error: sessionError,
      }: SupabaseAuthResponse = await supabase.auth.getSession();

      if (sessionError) {
        logger.error(
          ENABLE_LOGGING,
          'PowerSync: Failed to get Supabase session:',
          sessionError
        );
        throw sessionError;
      }

      // Require an existing session (anonymous or authenticated). Auth layer owns session creation.
      if (!session?.access_token) {
        throw new Error(
          'PowerSync: No Supabase session available for credentials'
        );
      }
      const accessToken: string = session.access_token;

      // Correctly determine if user is authenticated (not anonymous)
      const isAuthenticated = session?.user && !session.user.is_anonymous;

      const credentials: PowerSyncCredentials = {
        endpoint: env.powersync.url,
        token: accessToken,
        // Pass authentication status to sync rules as required by sync-rules.yaml
        parameters: {
          is_authenticated: isAuthenticated ? 'true' : 'false',
        },
      };

      // logger.info(ENABLE_LOGGING, 'PowerSync: Credentials fetched successfully', {
      //   isAuthenticated,
      //   userId: session?.user?.id,
      // });
      return credentials;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'PowerSync: Failed to fetch credentials:',
        error
      );
      throw error;
    }
  }

  /**
   * Get or create an anonymous session for unauthenticated users
   * This allows access to public Bible data without requiring user registration
   */
  // Note: Anonymous session creation is handled by the Auth layer

  /**
   * Upload local changes to the backend
   * Called when there are pending local changes to sync
   */
  async uploadData(database: AbstractPowerSyncDatabase) {
    try {
      // Get the next batch of CRUD operations to upload
      const transaction = await database.getNextCrudTransaction();

      if (!transaction) {
        return;
      }

      // If every operation targets disallowed (read-only) tables, acknowledge and skip whole batch
      const allDisallowed = transaction.crud.every(
        op => !isUploadAllowed(op.table, op.op)
      );
      if (allDisallowed) {
        // logger.debug(ENABLE_LOGGING, //   'PowerSync: Skipping entire transaction (read-only tables only)',
        //   {
        //     count: transaction.crud.length,
        //   }
        // );
        await transaction.complete();
        return;
      }

      // logger.info(ENABLE_LOGGING, //   `PowerSync: Uploading ${transaction.crud.length} operations...`
      // );

      // Cache session once per transaction to avoid repeated calls on slow devices
      let cachedUserId: string | null = null;

      for (const op of transaction.crud) {
        const table = op.table;
        const record = { ...op.opData, id: op.id };

        try {
          // Guard: Only allow uploads for whitelisted tables
          if (!isUploadAllowed(table, op.op)) {
            logger.debug(
              ENABLE_LOGGING,
              `PowerSync: Skipping upload for read-only table ${table} (${op.op})`,
              { id: op.id }
            );
            continue;
          }

          // Pre-validation: Skip records that will definitely fail
          if (powerSyncErrorHandler.shouldSkipUpload(table, record)) {
            continue; // Skip this record and continue with the next
          }

          switch (op.op) {
            case UpdateType.PUT:
              await this.upsertRecord(
                table,
                record,
                () => cachedUserId,
                (id: string) => {
                  cachedUserId = id;
                }
              );
              break;

            case UpdateType.PATCH:
              await this.updateRecord(table, record);
              break;

            case UpdateType.DELETE: {
              // Avoid remote DELETEs for upload-only analytics tables
              const ANALYTICS_UPLOAD_ONLY = new Set<string>([
                'sessions',
                'app_downloads',
                'chapter_listens',
                'media_file_listens',
                'verse_listens',
                'shares',
                'share_opens',
              ]);

              if (!ANALYTICS_UPLOAD_ONLY.has(table)) {
                await this.deleteRecord(table, op.id);
              } else {
                // Skip remote delete; only acknowledge the transaction item
                logger.debug(
                  ENABLE_LOGGING,
                  `PowerSync: Skipping remote delete for analytics table ${table}`,
                  { id: op.id }
                );
              }
              break;
            }

            default:
              logger.warn(
                ENABLE_LOGGING,
                `PowerSync: Unknown operation type: ${op.op}`
              );
          }
        } catch (operationError) {
          // Use centralized error handler for classification
          const classification = powerSyncErrorHandler.handleError(
            op.id,
            table,
            op.op.toString(),
            operationError as Error & { code?: string },
            'direct_upload',
            cachedUserId || undefined
          );

          // Only throw if the error is retryable
          if (classification.isRetryable && !classification.shouldSkip) {
            throw operationError;
          }
          // For non-retryable errors, continue with next operation
          // This implements graceful degradation
        }
      }

      // Mark transaction as complete
      await transaction.complete();
      // logger.info(ENABLE_LOGGING, 'PowerSync: Transaction completed successfully');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'PowerSync: Failed to upload data:', error);
      throw error;
    }
  }

  private async upsertRecord(
    table: string,
    record: Record<string, unknown>,
    getCachedUserId?: () => string | null,
    setCachedUserId?: (id: string) => void
  ): Promise<void> {
    // Transformations for server compatibility (e.g., PostGIS geometry expects GeoJSON object)
    const transformed: Record<string, unknown> = { ...record };
    if (typeof transformed['location'] === 'string') {
      const str = transformed['location'] as string;
      if (str.startsWith('{')) {
        try {
          transformed['location'] = JSON.parse(str);
        } catch {
          // leave as-is if parse fails
        }
      }
    }

    // Ensure user_id for analytics tables when missing to satisfy RLS (user_id = auth.uid())
    const ANALYTICS_TABLES_REQUIRE_USER = new Set<string>([
      'app_downloads',
      'sessions',
      'chapter_listens',
      'media_file_listens',
      'verse_listens',
      'shares',
      'share_opens',
    ]);
    if (ANALYTICS_TABLES_REQUIRE_USER.has(table)) {
      if (transformed['user_id'] == null) {
        try {
          let uid: string | undefined | null = getCachedUserId
            ? getCachedUserId()
            : null;
          if (!uid) {
            const { data } = await supabase.auth.getSession();
            uid = data.session?.user?.id;
          }
          if (uid) transformed['user_id'] = uid;
          if (uid && setCachedUserId) setCachedUserId(uid);
        } catch {
          // leave as null if cannot resolve
        }
      }
    }
    // Route only tables that need IP/location enrichment through Edge Function
    const ANALYTICS_TABLES = new Set<string>(['sessions', 'app_downloads']);

    if (ANALYTICS_TABLES.has(table)) {
      const payload = {
        ops: [
          {
            id: transformed['id'],
            table,
            op: 'PUT',
            opData: Object.fromEntries(
              Object.entries(transformed).filter(([k]) => k !== 'id')
            ),
          },
        ],
      };

      try {
        const { data: fnData, error: fnError } =
          await supabase.functions.invoke('ingest-analytics', {
            body: payload,
          });

        if (fnError) {
          // Let the error handler classify the edge function network error
          const classification = powerSyncErrorHandler.handleError(
            transformed['id'] as string,
            table,
            'PUT',
            fnError,
            'edge_function',
            transformed['user_id'] as string
          );

          if (!classification.shouldSkip && classification.isRetryable) {
            throw fnError; // Retryable error - let PowerSync retry
          }
          // Non-retryable or should skip - fall back to direct upsert
          logger.info(
            ENABLE_LOGGING,
            `PowerSync: Edge function failed, attempting direct fallback for ${table}`
          );
        } else {
          // Process edge function results - handle new IngestResponse format,
          // supporting wrappers like { status: 'ok', data: { ... } }
          type OperationResult = {
            id: string;
            table: string;
            status: 'ok' | 'skipped' | 'error';
            error?: string;
            retryable?: boolean;
          };

          type IngestResponse = {
            results: OperationResult[];
            publicUserId: string;
            requestId: string;
            totalOps: number;
            successCount: number;
            errorCount: number;
            skippedCount: number;
          };

          // Attempt to unwrap common shapes
          // 1) Direct shape: { results, publicUserId, ... }
          // 2) Wrapped: { status: 'ok', data: { results, ... } }
          const unwrap = (raw: unknown): IngestResponse | null => {
            const r = raw as {
              results?: unknown;
              data?: { results?: unknown };
            };
            if (r && Array.isArray(r.results))
              return r as unknown as IngestResponse;
            if (r && r.data && Array.isArray(r.data.results))
              return r.data as unknown as IngestResponse;
            return null;
          };

          const ingestResponse = unwrap(fnData);
          const results = ingestResponse?.results;

          if (Array.isArray(results) && results.length > 0) {
            // Find the result for our specific operation
            const operationResult = results.find(
              r => r.id === transformed['id']
            );

            if (!operationResult) {
              logger.warn(
                ENABLE_LOGGING,
                `PowerSync: No result found for operation ${transformed['id']} in edge function response`
              );
              // Fall back to direct upsert
            } else if (operationResult.status === 'ok') {
              // Success case - log and return
              logger.debug(
                ENABLE_LOGGING,
                `PowerSync: Successfully ingested analytics op in ${table}`,
                {
                  id: transformed['id'],
                  requestId: ingestResponse?.requestId,
                }
              );
              return;
            } else if (
              operationResult.status === 'error' ||
              operationResult.status === 'skipped'
            ) {
              // Use error handler to classify edge function response
              const classification = powerSyncErrorHandler.handleError(
                transformed['id'] as string,
                table,
                'PUT',
                operationResult,
                'edge_function',
                transformed['user_id'] as string
              );

              if (classification.shouldSkip && !classification.isRetryable) {
                // Skip this record entirely
                logger.info(
                  ENABLE_LOGGING,
                  `PowerSync: Edge function marked operation as non-retryable for ${table}`,
                  {
                    id: transformed['id'],
                    status: operationResult.status,
                    reason: operationResult.error,
                  }
                );
                return;
              }

              if (
                operationResult.status === 'error' &&
                classification.isRetryable
              ) {
                throw new Error(
                  `Analytics ingest op failed for ${table}: ${operationResult.error || 'unknown error'}`
                );
              }

              // For skipped or non-retryable errors, fall back to direct upsert
              logger.info(
                ENABLE_LOGGING,
                `PowerSync: Edge function ${operationResult.status}, attempting direct fallback for ${table}`,
                {
                  id: transformed['id'],
                  reason: operationResult.error,
                }
              );
            }
          } else {
            // Edge function returned unexpected shape; log and fallback
            logger.warn(
              ENABLE_LOGGING,
              `PowerSync: Ingest returned unexpected response format; falling back to direct upsert for ${table}`,
              {
                id: transformed['id'],
                responseStructure: {
                  hasResults: Boolean(
                    (fnData as { results?: unknown })?.results ||
                    (fnData as { data?: { results?: unknown } })?.data?.results
                  ),
                  resultsLength: Array.isArray(
                    (fnData as { results?: unknown })?.results
                  )
                    ? ((fnData as { results: unknown[] }).results
                        .length as number)
                    : Array.isArray(
                          (fnData as { data?: { results?: unknown } })?.data
                            ?.results
                        )
                      ? ((fnData as { data: { results: unknown[] } }).data
                          .results.length as number)
                      : 0,
                  totalOps:
                    (fnData as { totalOps?: number })?.totalOps ??
                    (fnData as { data?: { totalOps?: number } })?.data
                      ?.totalOps,
                  successCount:
                    (fnData as { successCount?: number })?.successCount ??
                    (fnData as { data?: { successCount?: number } })?.data
                      ?.successCount,
                  errorCount:
                    (fnData as { errorCount?: number })?.errorCount ??
                    (fnData as { data?: { errorCount?: number } })?.data
                      ?.errorCount,
                },
              }
            );
          }
        }

        // Fallback to direct upsert
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from(table)
            .upsert(transformed, { onConflict: 'id' });

          if (error) {
            // Classify the fallback error
            const classification = powerSyncErrorHandler.handleError(
              transformed['id'] as string,
              table,
              'PUT',
              error as Error & { code?: string },
              'direct_upload',
              transformed['user_id'] as string
            );

            if (!classification.shouldSkip && classification.isRetryable) {
              throw error; // Retryable error
            }
            // Non-retryable - skip silently
            return;
          }

          logger.debug(
            ENABLE_LOGGING,
            `PowerSync: Fallback upsert successful for ${table}`,
            {
              id: transformed['id'],
            }
          );
        } catch (fallbackError) {
          // Final fallback error - classify and handle
          const classification = powerSyncErrorHandler.handleError(
            transformed['id'] as string,
            table,
            'PUT',
            fallbackError as Error & { code?: string },
            'direct_upload',
            transformed['user_id'] as string
          );

          if (!classification.shouldSkip && classification.isRetryable) {
            throw fallbackError;
          }
          // Skip non-retryable errors
        }
      } catch (edgeError) {
        // This catch handles any unexpected errors from the edge function flow
        const classification = powerSyncErrorHandler.handleError(
          transformed['id'] as string,
          table,
          'PUT',
          edgeError as Error & { code?: string },
          'edge_function',
          transformed['user_id'] as string
        );

        if (!classification.shouldSkip && classification.isRetryable) {
          throw edgeError;
        }
        // Skip non-retryable errors
      }

      return;
    }

    // DIRECT SUPABASE PATH - with centralized error handling
    try {
      // For singleton-per-user tables like user_current_selections, target the unique user_id
      // so a blind insert will overwrite the existing row for that user without a read.
      const onConflictColumn =
        table === 'user_current_selections' ? 'user_id' : 'id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(table)
        .upsert(transformed, { onConflict: onConflictColumn });

      if (error) {
        // Use centralized error handler for direct upload errors
        const classification = powerSyncErrorHandler.handleError(
          record['id'] as string,
          table,
          'PUT',
          // Preserve original message string for classifier visibility
          Object.assign(new Error(error.message || String(error)), {
            code: (error as Error & { code?: string }).code,
          }) as Error & { code?: string },
          'direct_upload',
          transformed['user_id'] as string
        );

        if (!classification.shouldSkip && classification.isRetryable) {
          throw error; // Retryable error - let PowerSync retry
        }
        // Non-retryable or should skip - return silently
        return;
      }

      logger.debug(ENABLE_LOGGING, `PowerSync: Upserted record in ${table}:`, {
        id: record['id'],
      });
    } catch (directError) {
      // Handle any unexpected errors in direct upload path
      const classification = powerSyncErrorHandler.handleError(
        record['id'] as string,
        table,
        'PUT',
        directError as Error & { code?: string },
        'direct_upload',
        transformed['user_id'] as string
      );

      if (!classification.shouldSkip && classification.isRetryable) {
        throw directError;
      }
      // Skip non-retryable errors
    }
  }

  private async updateRecord(
    table: string,
    record: Record<string, unknown>
  ): Promise<void> {
    // Skip remote updates for analytics tables we now manage via lifecycle/Edge Functions
    if (table === 'sessions' || table === 'app_downloads') {
      // Intentionally no-op to avoid RLS-sensitive PATCHes and reduce churn
      return;
    }

    const { id, ...updateData } = record;
    const transformed: Record<string, unknown> = { ...updateData };
    if (typeof transformed['location'] === 'string') {
      const str = transformed['location'] as string;
      if (str.startsWith('{')) {
        try {
          transformed['location'] = JSON.parse(str);
        } catch {
          // ignore parse error
        }
      }
    }

    try {
      // Using 'any' here is necessary because Supabase's typed client doesn't support dynamic table names, but PowerSync needs to work with any table defined in sync rules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(table)
        .update(transformed)
        .eq('id', id);

      if (error) {
        // Use centralized error handler for update errors
        const classification = powerSyncErrorHandler.handleError(
          id as string,
          table,
          'PATCH',
          error,
          'direct_upload'
        );

        if (!classification.shouldSkip && classification.isRetryable) {
          throw error;
        }
        // Skip non-retryable errors
        return;
      }

      logger.debug(ENABLE_LOGGING, `PowerSync: Updated record in ${table}:`, {
        id,
      });
    } catch (updateError) {
      // Handle unexpected errors
      const classification = powerSyncErrorHandler.handleError(
        id as string,
        table,
        'PATCH',
        updateError as Error & { code?: string },
        'direct_upload'
      );

      if (!classification.shouldSkip && classification.isRetryable) {
        throw updateError;
      }
      // Skip non-retryable errors
    }
  }

  private async deleteRecord(table: string, id: string): Promise<void> {
    try {
      // Using 'any' here is necessary because Supabase's typed client doesn't support dynamic table names, but PowerSync needs to work with any table defined in sync rules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        // Use centralized error handler for delete errors
        const classification = powerSyncErrorHandler.handleError(
          id,
          table,
          'DELETE',
          error,
          'direct_upload'
        );

        if (!classification.shouldSkip && classification.isRetryable) {
          throw error;
        }
        // Skip non-retryable errors
        return;
      }

      logger.debug(ENABLE_LOGGING, `PowerSync: Deleted record from ${table}:`, {
        id,
      });
    } catch (deleteError) {
      // Handle unexpected errors
      const classification = powerSyncErrorHandler.handleError(
        id,
        table,
        'DELETE',
        deleteError as Error & { code?: string },
        'direct_upload'
      );

      if (!classification.shouldSkip && classification.isRetryable) {
        throw deleteError;
      }
      // Skip non-retryable errors
    }
  }
}

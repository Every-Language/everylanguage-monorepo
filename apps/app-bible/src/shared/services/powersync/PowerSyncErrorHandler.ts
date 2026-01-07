import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export interface PowerSyncError {
  id: string;
  table: string;
  operation: string;
  error: Error;
  context: 'edge_function' | 'direct_upload';
  timestamp: number;
  isRetryable: boolean;
  userId?: string | undefined;
}

export interface ErrorClassificationResult {
  isRetryable: boolean;
  shouldSkip: boolean;
  reason: string;
  category:
    | 'rls_violation'
    | 'constraint_violation'
    | 'network_error'
    | 'auth_error'
    | 'schema_error'
    | 'transaction_conflict'
    | 'unknown';
}

export interface PowerSyncErrorStats {
  edgeFunction: {
    retryable: number;
    nonRetryable: number;
    skipped: number;
  };
  directUpload: {
    retryable: number;
    nonRetryable: number;
    skipped: number;
  };
  byCategory: {
    rls_violation: number;
    constraint_violation: number;
    network_error: number;
    auth_error: number;
    schema_error: number;
    transaction_conflict: number;
    unknown: number;
  };
}

/**
 * Centralized PowerSync error handler with classification and graceful degradation
 */
export class PowerSyncErrorHandler {
  private static instance: PowerSyncErrorHandler;
  private errorQueue: PowerSyncError[] = [];
  private stats: PowerSyncErrorStats = {
    edgeFunction: { retryable: 0, nonRetryable: 0, skipped: 0 },
    directUpload: { retryable: 0, nonRetryable: 0, skipped: 0 },
    byCategory: {
      rls_violation: 0,
      constraint_violation: 0,
      network_error: 0,
      auth_error: 0,
      schema_error: 0,
      transaction_conflict: 0,
      unknown: 0,
    },
  };

  private constructor() {}

  public static getInstance(): PowerSyncErrorHandler {
    if (!PowerSyncErrorHandler.instance) {
      PowerSyncErrorHandler.instance = new PowerSyncErrorHandler();
    }
    return PowerSyncErrorHandler.instance;
  }

  /**
   * Classify an error for edge function responses
   * Updated to handle new structured OperationResult format
   */
  public classifyEdgeFunctionError(
    result: {
      status: 'ok' | 'skipped' | 'error';
      error?: string;
      retryable?: boolean;
    },
    _table: string
  ): ErrorClassificationResult {
    const errorMessage = result.error?.toLowerCase() || '';

    // Handle successful operations
    if (result.status === 'ok') {
      return {
        isRetryable: false,
        shouldSkip: false,
        reason: 'Operation completed successfully',
        category: 'unknown',
      };
    }

    // Edge function returned 'skipped' - always non-retryable
    if (result.status === 'skipped') {
      return {
        isRetryable: false,
        shouldSkip: true,
        reason: result.error || 'Operation skipped by edge function',
        category: 'unknown',
      };
    }

    // Edge function returned 'error' - use edge function's retryable classification
    if (result.status === 'error') {
      // Trust the edge function's retryable classification if provided
      const isRetryable =
        result.retryable ??
        this.classifyErrorMessage(errorMessage, 'edge_function').isRetryable;

      return {
        isRetryable,
        shouldSkip: !isRetryable,
        reason: result.error || 'Edge function reported error',
        category: this.categorizeError(errorMessage),
      };
    }

    // Shouldn't reach here, but handle gracefully
    return {
      isRetryable: true,
      shouldSkip: false,
      reason: 'Unknown edge function response',
      category: 'unknown',
    };
  }

  /**
   * Classify a direct database error
   */
  public classifyDirectError(
    error: Error & { code?: string },
    _table: string
  ): ErrorClassificationResult {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    return this.classifyErrorMessage(errorMessage, 'direct_upload', errorCode);
  }

  /**
   * Categorize error message into specific category
   */
  private categorizeError(
    errorMessage: string
  ):
    | 'rls_violation'
    | 'constraint_violation'
    | 'network_error'
    | 'auth_error'
    | 'schema_error'
    | 'unknown' {
    if (
      errorMessage.includes('row-level security policy') ||
      errorMessage.includes('permission denied')
    ) {
      return 'rls_violation';
    }

    if (
      errorMessage.includes('violates') &&
      (errorMessage.includes('constraint') ||
        errorMessage.includes('duplicate key'))
    ) {
      return 'constraint_violation';
    }

    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')
    ) {
      return 'network_error';
    }

    if (
      errorMessage.includes('jwt') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized')
    ) {
      return 'auth_error';
    }

    if (
      (errorMessage.includes('column') &&
        errorMessage.includes('does not exist')) ||
      (errorMessage.includes('relation') &&
        errorMessage.includes('does not exist'))
    ) {
      return 'schema_error';
    }

    return 'unknown';
  }

  /**
   * Core error classification logic
   */
  private classifyErrorMessage(
    errorMessage: string,
    _context: 'edge_function' | 'direct_upload',
    errorCode?: string
  ): ErrorClassificationResult {
    // Transaction nesting errors (retryable - will succeed after upload lock is released)
    if (
      errorMessage.includes(
        'cannot start a transaction within a transaction'
      ) ||
      (errorMessage.includes('transaction') &&
        (errorMessage.includes('already active') ||
          errorMessage.includes('within a transaction') ||
          errorMessage.includes('nested transaction')))
    ) {
      return {
        isRetryable: true,
        shouldSkip: false,
        reason: 'Transaction conflict - concurrent upload attempt',
        category: 'transaction_conflict',
      };
    }

    // RLS violations (non-retryable)
    if (
      errorMessage.includes('row-level security policy') ||
      errorMessage.includes('permission denied') ||
      errorCode === '42501'
    ) {
      return {
        isRetryable: false,
        shouldSkip: true,
        reason: 'RLS policy violation',
        category: 'rls_violation',
      };
    }

    // Authentication errors (non-retryable in current context)
    if (
      errorMessage.includes('jwt') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('unauthorized') ||
      errorCode === '42501'
    ) {
      return {
        isRetryable: false,
        shouldSkip: true,
        reason: 'Authentication error',
        category: 'auth_error',
      };
    }

    // Constraint violations (usually non-retryable)
    const constraintErrorCodes = ['23505', '23502', '23514', '23503'];
    if (
      constraintErrorCodes.includes(errorCode || '') ||
      errorMessage.includes('violates not-null constraint') ||
      errorMessage.includes('violates unique constraint') ||
      errorMessage.includes('violates check constraint') ||
      errorMessage.includes('violates foreign key constraint') ||
      errorMessage.includes('duplicate key value')
    ) {
      return {
        isRetryable: false,
        shouldSkip: true,
        reason: 'Database constraint violation',
        category: 'constraint_violation',
      };
    }

    // Schema errors (non-retryable)
    if (
      (errorMessage.includes('column') &&
        errorMessage.includes('does not exist')) ||
      (errorMessage.includes('relation') &&
        errorMessage.includes('does not exist')) ||
      errorMessage.includes('invalid input syntax') ||
      (errorMessage.includes('type') && errorMessage.includes('does not exist'))
    ) {
      return {
        isRetryable: false,
        shouldSkip: true,
        reason: 'Schema mismatch or syntax error',
        category: 'schema_error',
      };
    }

    // Network/connectivity errors (retryable)
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('econnreset') ||
      errorMessage.includes('enotfound') ||
      errorMessage.includes('etimedout')
    ) {
      return {
        isRetryable: true,
        shouldSkip: false,
        reason: 'Network or connectivity error',
        category: 'network_error',
      };
    }

    // Server errors (potentially retryable)
    if (
      errorMessage.includes('internal server error') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('bad gateway') ||
      errorMessage.includes('gateway timeout')
    ) {
      return {
        isRetryable: true,
        shouldSkip: false,
        reason: 'Server error',
        category: 'network_error',
      };
    }

    // Default to non-retryable for safety in analytics context
    // Analytics data loss is preferable to blocking the queue
    return {
      isRetryable: false,
      shouldSkip: true,
      reason: 'Unknown error - defaulting to skip for safety',
      category: 'unknown',
    };
  }

  /**
   * Handle an error with classification and logging
   */
  public handleError(
    id: string,
    table: string,
    operation: string,
    error:
      | Error
      | {
          status: 'ok' | 'skipped' | 'error';
          error?: string;
          retryable?: boolean;
        },
    context: 'edge_function' | 'direct_upload',
    userId?: string
  ): ErrorClassificationResult {
    let classification: ErrorClassificationResult;

    if (
      context === 'edge_function' &&
      typeof error === 'object' &&
      'status' in error
    ) {
      classification = this.classifyEdgeFunctionError(error, table);
    } else {
      classification = this.classifyDirectError(
        error as Error & { code?: string },
        table
      );
    }

    // Create error record
    const errorRecord: PowerSyncError = {
      id,
      table,
      operation,
      error:
        error instanceof Error
          ? error
          : new Error(error.error || 'Unknown edge function error'),
      context,
      timestamp: Date.now(),
      isRetryable: classification.isRetryable,
      userId,
    };

    // Update statistics
    this.updateStats(context, classification);

    // Store error (keep last 100)
    this.errorQueue.push(errorRecord);
    if (this.errorQueue.length > 100) {
      this.errorQueue = this.errorQueue.slice(-100);
    }

    // Log appropriately based on classification
    if (classification.shouldSkip) {
      logger.info(
        ENABLE_LOGGING,
        `PowerSync: Skipping ${context} operation for ${table}`,
        {
          id,
          operation,
          reason: classification.reason,
          category: classification.category,
          userId,
        }
      );
    } else if (classification.isRetryable) {
      logger.warn(
        ENABLE_LOGGING,
        `PowerSync: Retryable error in ${context} for ${table}`,
        {
          id,
          operation,
          reason: classification.reason,
          category: classification.category,
          error: errorRecord.error.message,
          userId,
        }
      );
    } else {
      logger.error(
        ENABLE_LOGGING,
        `PowerSync: Non-retryable error in ${context} for ${table}`,
        {
          id,
          operation,
          reason: classification.reason,
          category: classification.category,
          error: errorRecord.error.message,
          userId,
        }
      );
    }

    // Report critical errors if needed
    if (this.isCriticalError(classification, table)) {
      this.reportCriticalError(errorRecord, classification);
    }

    return classification;
  }

  /**
   * Update error statistics
   */
  private updateStats(
    context: 'edge_function' | 'direct_upload',
    classification: ErrorClassificationResult
  ): void {
    const contextStats =
      context === 'edge_function'
        ? this.stats.edgeFunction
        : this.stats.directUpload;

    if (classification.shouldSkip) {
      contextStats.skipped++;
    } else if (classification.isRetryable) {
      contextStats.retryable++;
    } else {
      contextStats.nonRetryable++;
    }

    this.stats.byCategory[classification.category]++;

    // Log stats periodically
    const totalErrors = Object.values(this.stats.byCategory).reduce(
      (sum, count) => sum + count,
      0
    );
    if (totalErrors % 10 === 0 && totalErrors > 0) {
      logger.info(ENABLE_LOGGING, 'PowerSync Error Statistics:', this.stats);
    }
  }

  /**
   * Determine if an error is critical and needs immediate attention
   */
  private isCriticalError(
    classification: ErrorClassificationResult,
    table: string
  ): boolean {
    // RLS violations on user tables are critical
    if (
      classification.category === 'rls_violation' &&
      table.startsWith('user_')
    ) {
      return true;
    }

    // Schema errors are critical as they indicate code/deployment issues
    if (classification.category === 'schema_error') {
      return true;
    }

    // High frequency of the same error type
    const categoryCount = this.stats.byCategory[classification.category];
    if (categoryCount > 5) {
      return true;
    }

    return false;
  }

  /**
   * Report critical errors (implement your error reporting service here)
   */
  private reportCriticalError(
    errorRecord: PowerSyncError,
    classification: ErrorClassificationResult
  ): void {
    logger.error(ENABLE_LOGGING, 'CRITICAL PowerSync Error:', {
      error: errorRecord,
      classification,
      stats: this.stats,
    });

    // TODO: Integrate with your error reporting service (Sentry, Bugsnag, etc.)
    // Example:
    // if (env.sentry?.dsn) {
    //   Sentry.captureException(errorRecord.error, {
    //     tags: {
    //       component: 'powersync',
    //       context: errorRecord.context,
    //       table: errorRecord.table,
    //       category: classification.category,
    //     },
    //     extra: {
    //       classification,
    //       stats: this.stats,
    //     },
    //   });
    // }
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(): PowerSyncError[] {
    return [...this.errorQueue];
  }

  /**
   * Get current error statistics
   */
  public getStats(): PowerSyncErrorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing or manual reset)
   */
  public resetStats(): void {
    this.stats = {
      edgeFunction: { retryable: 0, nonRetryable: 0, skipped: 0 },
      directUpload: { retryable: 0, nonRetryable: 0, skipped: 0 },
      byCategory: {
        rls_violation: 0,
        constraint_violation: 0,
        network_error: 0,
        auth_error: 0,
        schema_error: 0,
        transaction_conflict: 0,
        unknown: 0,
      },
    };
    logger.info(ENABLE_LOGGING, 'PowerSync error statistics reset');
  }

  /**
   * Check if we should skip uploading a record based on pre-validation
   */
  public shouldSkipUpload(
    table: string,
    record: Record<string, unknown>
  ): boolean {
    // Analytics tables require user_id
    const ANALYTICS_TABLES_REQUIRE_USER = new Set<string>([
      'app_downloads',
      'sessions',
      'chapter_listens',
      'media_file_listens',
      'verse_listens',
      'shares',
      'share_opens',
    ]);

    if (ANALYTICS_TABLES_REQUIRE_USER.has(table) && !record['user_id']) {
      logger.info(
        ENABLE_LOGGING,
        `PowerSync: Pre-validation skip for ${table} - missing user_id`,
        {
          id: record['id'],
        }
      );
      return true;
    }

    return false;
  }

  /**
   * Process IngestResponse from updated edge function and provide summary statistics
   */
  public processIngestResponse(response: {
    results: Array<{
      id: string;
      table: string;
      status: 'ok' | 'skipped' | 'error';
      error?: string;
      retryable?: boolean;
    }>;
    totalOps: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
    requestId?: string;
  }): {
    success: number;
    retryableErrors: number;
    nonRetryableErrors: number;
    skipped: number;
    shouldRetryBatch: boolean;
  } {
    let retryableErrors = 0;
    let nonRetryableErrors = 0;

    // Process each result for detailed classification
    for (const result of response.results) {
      if (result.status === 'error') {
        if (result.retryable === true) {
          retryableErrors++;
        } else if (result.retryable === false) {
          nonRetryableErrors++;
        } else {
          // Fallback classification if retryable field is missing
          const classification = this.classifyEdgeFunctionError(
            result,
            result.table
          );
          if (classification.isRetryable) {
            retryableErrors++;
          } else {
            nonRetryableErrors++;
          }
        }
      }
    }

    // Batch should be retried if there are any retryable errors
    const shouldRetryBatch = retryableErrors > 0;

    logger.info(ENABLE_LOGGING, 'PowerSync: Processed IngestResponse', {
      requestId: response.requestId,
      totalOps: response.totalOps,
      success: response.successCount,
      retryableErrors,
      nonRetryableErrors,
      skipped: response.skippedCount,
      shouldRetryBatch,
    });

    return {
      success: response.successCount,
      retryableErrors,
      nonRetryableErrors,
      skipped: response.skippedCount,
      shouldRetryBatch,
    };
  }
}

// Export singleton instance
export const powerSyncErrorHandler = PowerSyncErrorHandler.getInstance();

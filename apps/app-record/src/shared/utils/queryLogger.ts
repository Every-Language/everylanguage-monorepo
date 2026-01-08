import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Global declaration for React Native __DEV__ variable
declare const __DEV__: boolean;

export interface QueryLogEntry {
  id: string;
  context: string;
  query: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  resultCount?: number;
  error?: string;
}

export class QueryLogger {
  private static instance: QueryLogger;
  private activeQueries = new Map<string, QueryLogEntry>();
  private queryTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private completedQueries: QueryLogEntry[] = [];
  private maxCompletedQueries = 50;
  private isEnabled =
    __DEV__ || process.env['ENABLE_POWERSYNC_MONITORING'] === 'true';
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    if (this.isEnabled) {
      this.startPeriodicCleanup();
      logger.info(
        ENABLE_LOGGING,
        `[QueryLogger] 🛠️ Query logging enabled (${__DEV__ ? 'development' : 'production'} mode)`
      );
    }
  }

  public static getInstance(): QueryLogger {
    if (!QueryLogger.instance) {
      QueryLogger.instance = new QueryLogger();
    }
    return QueryLogger.instance;
  }

  /**
   * Log the start of a query with automatic cleanup
   */
  public logQueryStart(
    context: string,
    query: string,
    customId?: string
  ): string {
    if (!this.isEnabled) {
      return '';
    }

    const id = customId || this.generateId();
    const startTime = Date.now();

    const logEntry: QueryLogEntry = {
      id,
      context: this.normalizeContext(context),
      query: this.sanitizeQuery(query),
      startTime,
    };

    this.activeQueries.set(id, logEntry);

    // Auto-cleanup after 30 seconds to prevent memory leaks
    const timeout = setTimeout(() => {
      this.cleanupOrphanedQuery(id);
    }, 30000);

    this.queryTimeouts.set(id, timeout);

    logger.debug(
      ENABLE_LOGGING,
      `[QueryLogger] 🚀 Query started: ${logEntry.context}`,
      {
        id,
        query: logEntry.query,
        timestamp: new Date(startTime).toISOString(),
      }
    );

    return id;
  }

  /**
   * Log the completion of a query with automatic cleanup
   */
  public logQueryEnd(id: string, resultCount?: number, error?: string): void {
    if (!this.isEnabled || !id) {
      return;
    }

    const logEntry = this.activeQueries.get(id);
    if (!logEntry) {
      logger.warn(
        ENABLE_LOGGING,
        `[QueryLogger] ⚠️ Query end logged for unknown ID: ${id}`
      );
      return;
    }

    // Clean up timeout
    const timeout = this.queryTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.queryTimeouts.delete(id);
    }

    const endTime = Date.now();
    const duration = endTime - logEntry.startTime;

    // Update log entry
    logEntry.endTime = endTime;
    logEntry.duration = duration;
    if (resultCount !== undefined) {
      logEntry.resultCount = resultCount;
    }
    if (error !== undefined) {
      logEntry.error = error;
    }

    // Move to completed queries
    this.activeQueries.delete(id);
    this.completedQueries.push(logEntry);

    // Keep only recent completed queries
    if (this.completedQueries.length > this.maxCompletedQueries) {
      this.completedQueries = this.completedQueries.slice(
        -this.maxCompletedQueries
      );
    }

    // Log with appropriate level and context
    if (error) {
      this.logQueryError(logEntry);
    } else if (duration > 1000) {
      this.logSlowQuery(logEntry);
    } else {
      this.logQuerySuccess(logEntry);
    }
  }

  /**
   * Log successful query completion
   */
  private logQuerySuccess(logEntry: QueryLogEntry): void {
    logger.info(
      ENABLE_LOGGING,
      `[QueryLogger] ✅ Query completed: ${logEntry.context} (${logEntry.duration}ms)`,
      {
        id: logEntry.id,
        query: logEntry.query,
        resultCount: logEntry.resultCount,
        duration: logEntry.duration,
      }
    );
  }

  /**
   * Log slow query with severity levels
   */
  private logSlowQuery(logEntry: QueryLogEntry): void {
    const severity = this.getSeverityLevel(logEntry.duration || 0);
    const logLevel = severity === 'CRITICAL' ? 'error' : 'warn';

    logger[logLevel](
      ENABLE_LOGGING,
      `[QueryLogger] ${severity} Slow query: ${logEntry.context} (${logEntry.duration}ms)`,
      {
        id: logEntry.id,
        query: logEntry.query,
        resultCount: logEntry.resultCount,
        duration: logEntry.duration,
        severity,
      }
    );
  }

  /**
   * Log query error with full context
   */
  private logQueryError(logEntry: QueryLogEntry): void {
    logger.error(
      ENABLE_LOGGING,
      `[QueryLogger] ❌ Query error: ${logEntry.context} (${logEntry.duration}ms)`,
      {
        id: logEntry.id,
        query: logEntry.query,
        error: logEntry.error,
        duration: logEntry.duration,
        context: logEntry.context,
      }
    );
  }

  /**
   * Get severity level based on duration
   */
  private getSeverityLevel(
    duration: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (duration > 5000) return 'CRITICAL';
    if (duration > 2000) return 'HIGH';
    if (duration > 1000) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Clean up orphaned queries to prevent memory leaks
   */
  private cleanupOrphanedQuery(id: string): void {
    const logEntry = this.activeQueries.get(id);
    if (logEntry) {
      const duration = Date.now() - logEntry.startTime;

      logger.warn(
        ENABLE_LOGGING,
        `[QueryLogger] ⚠️ Orphaned query detected: ${logEntry.context} (${duration}ms)`,
        {
          id: logEntry.id,
          query: logEntry.query,
          duration,
          context: logEntry.context,
        }
      );

      // Clean up
      this.activeQueries.delete(id);
      const timeout = this.queryTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.queryTimeouts.delete(id);
      }
    }
  }

  /**
   * Start periodic cleanup to prevent memory accumulation
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(
      () => {
        this.performPeriodicCleanup();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Perform periodic cleanup of old data
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Clean up old completed queries
    this.completedQueries = this.completedQueries.filter(
      q => now - (q.endTime || 0) < maxAge
    );

    // Log cleanup stats
    if (this.completedQueries.length > 0 || this.activeQueries.size > 0) {
      logger.debug(
        ENABLE_LOGGING,
        `[QueryLogger] 🧹 Cleanup: ${this.completedQueries.length} completed, ${this.activeQueries.size} active queries`
      );
    }
  }

  /**
   * Get recent query performance summary
   */
  public getRecentPerformance(): {
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
    recentQueries: QueryLogEntry[];
    activeQueries: number;
  } {
    const recent = this.completedQueries.filter(
      q => Date.now() - (q.endTime || 0) < 5 * 60 * 1000 // Last 5 minutes
    );

    const slowQueries = recent.filter(q => (q.duration || 0) > 1000);
    const averageTime =
      recent.length > 0
        ? recent.reduce((sum, q) => sum + (q.duration || 0), 0) / recent.length
        : 0;

    return {
      totalQueries: recent.length,
      slowQueries: slowQueries.length,
      averageTime: Math.round(averageTime),
      recentQueries: recent.slice(-10), // Last 10 queries
      activeQueries: this.activeQueries.size,
    };
  }

  /**
   * Get active queries for debugging
   */
  public getActiveQueries(): QueryLogEntry[] {
    return Array.from(this.activeQueries.values());
  }

  /**
   * Normalize context names for consistency
   */
  private normalizeContext(context: string): string {
    return context
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Sanitize query for logging
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\b\d+\b/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute a query with automatic start/end logging
   * Provides the same functionality as useQueryLogger hook for service-level usage
   */
  public async logQuery<T>(
    context: string,
    query: string,
    queryFn: () => Promise<T>,
    customId?: string
  ): Promise<T> {
    if (!this.isEnabled) {
      // Production mode: execute without logging
      return await queryFn();
    }

    const id = this.logQueryStart(context, query, customId);
    let resultCount: number | undefined;
    let error: string | undefined;

    try {
      const result = await queryFn();
      resultCount = this.getResultCount(result);
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      throw err; // Re-throw to maintain error propagation
    } finally {
      this.logQueryEnd(id, resultCount, error);
    }
  }

  /**
   * Enhanced result count detection for various result formats
   */
  private getResultCount(result: unknown): number | undefined {
    if (Array.isArray(result)) {
      return result.length;
    }

    if (result && typeof result === 'object') {
      // PowerSync result format
      if ('rows' in result && Array.isArray(result.rows)) {
        return result.rows.length;
      }

      // SQLite result format
      if ('_array' in result && Array.isArray(result._array)) {
        return result._array.length;
      }

      // Generic object with length
      if ('length' in result && typeof result.length === 'number') {
        return result.length;
      }
    }

    return undefined;
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Clear all timeouts
    for (const timeout of this.queryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.queryTimeouts.clear();
    this.activeQueries.clear();
    this.completedQueries = [];
  }
}

// Export singleton instance
export const queryLogger = QueryLogger.getInstance();

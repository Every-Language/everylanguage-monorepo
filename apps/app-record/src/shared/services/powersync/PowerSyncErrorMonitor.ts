import { powerSyncErrorHandler } from './PowerSyncErrorHandler';
import { logger } from '@/shared/utils/logger';
import type {
  PowerSyncError,
  PowerSyncErrorStats,
} from './PowerSyncErrorHandler';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * PowerSync Error Monitor - utilities for debugging and monitoring error patterns
 */
export class PowerSyncErrorMonitor {
  private static instance: PowerSyncErrorMonitor;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  public static getInstance(): PowerSyncErrorMonitor {
    if (!PowerSyncErrorMonitor.instance) {
      PowerSyncErrorMonitor.instance = new PowerSyncErrorMonitor();
    }
    return PowerSyncErrorMonitor.instance;
  }

  /**
   * Start periodic error monitoring for debugging
   */
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.logErrorSummary();
    }, intervalMs);

    logger.info(ENABLE_LOGGING, 'PowerSync error monitoring started', {
      intervalMs,
    });
  }

  /**
   * Stop error monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info(ENABLE_LOGGING, 'PowerSync error monitoring stopped');
    }
  }

  /**
   * Get current error statistics
   */
  public getErrorStats(): PowerSyncErrorStats {
    return powerSyncErrorHandler.getStats();
  }

  /**
   * Get recent errors for debugging
   */
  public getRecentErrors(limit?: number): PowerSyncError[] {
    const errors = powerSyncErrorHandler.getRecentErrors();
    return limit ? errors.slice(-limit) : errors;
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: string): PowerSyncError[] {
    return powerSyncErrorHandler.getRecentErrors().filter(error => {
      const classification = powerSyncErrorHandler.classifyDirectError(
        error.error,
        error.table
      );
      return classification.category === category;
    });
  }

  /**
   * Check if there are critical error patterns
   */
  public checkForCriticalPatterns(): {
    hasCriticalPatterns: boolean;
    patterns: Array<{ type: string; count: number; description: string }>;
  } {
    const stats = this.getErrorStats();
    const patterns: Array<{
      type: string;
      count: number;
      description: string;
    }> = [];
    let hasCriticalPatterns = false;

    // Check for high RLS violation rates
    if (stats.byCategory.rls_violation > 10) {
      patterns.push({
        type: 'high_rls_violations',
        count: stats.byCategory.rls_violation,
        description:
          'High number of RLS violations may indicate authentication issues',
      });
      hasCriticalPatterns = true;
    }

    // Check for schema errors
    if (stats.byCategory.schema_error > 3) {
      patterns.push({
        type: 'schema_errors',
        count: stats.byCategory.schema_error,
        description: 'Schema errors may indicate deployment/migration issues',
      });
      hasCriticalPatterns = true;
    }

    // Check for high skip rates
    const totalOperations =
      Object.values(stats.edgeFunction).reduce((sum, val) => sum + val, 0) +
      Object.values(stats.directUpload).reduce((sum, val) => sum + val, 0);
    const totalSkipped =
      stats.edgeFunction.skipped + stats.directUpload.skipped;
    const skipRate =
      totalOperations > 0 ? (totalSkipped / totalOperations) * 100 : 0;

    if (skipRate > 20) {
      patterns.push({
        type: 'high_skip_rate',
        count: Math.round(skipRate),
        description: `${Math.round(skipRate)}% of operations are being skipped`,
      });
      hasCriticalPatterns = true;
    }

    return { hasCriticalPatterns, patterns };
  }

  /**
   * Log error summary for monitoring
   */
  private logErrorSummary(): void {
    const stats = this.getErrorStats();
    const recentErrors = this.getRecentErrors(10);
    const criticalPatterns = this.checkForCriticalPatterns();

    logger.info(ENABLE_LOGGING, 'PowerSync Error Summary', {
      stats,
      recentErrorCount: recentErrors.length,
      criticalPatterns: criticalPatterns.hasCriticalPatterns
        ? criticalPatterns.patterns
        : null,
    });

    if (criticalPatterns.hasCriticalPatterns) {
      logger.warn(
        ENABLE_LOGGING,
        'PowerSync: Critical error patterns detected',
        criticalPatterns.patterns
      );
    }
  }

  /**
   * Reset all error statistics (useful for testing or manual reset)
   */
  public resetStats(): void {
    powerSyncErrorHandler.resetStats();
    logger.info(ENABLE_LOGGING, 'PowerSync error statistics reset via monitor');
  }

  /**
   * Export error data for external analysis
   */
  public exportErrorData(): {
    stats: PowerSyncErrorStats;
    recentErrors: PowerSyncError[];
    criticalPatterns: {
      hasCriticalPatterns: boolean;
      patterns: Array<{ type: string; count: number; description: string }>;
    };
    exportedAt: number;
  } {
    return {
      stats: this.getErrorStats(),
      recentErrors: this.getRecentErrors(),
      criticalPatterns: this.checkForCriticalPatterns(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Get error rate over time (last N errors)
   */
  public getErrorRate(timeWindowMs: number = 300000): {
    totalErrors: number;
    errorsPerMinute: number;
    retryableErrors: number;
    nonRetryableErrors: number;
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentErrors = this.getRecentErrors().filter(
      error => error.timestamp >= cutoffTime
    );

    const retryableErrors = recentErrors.filter(
      error => error.isRetryable
    ).length;
    const nonRetryableErrors = recentErrors.filter(
      error => !error.isRetryable
    ).length;
    const totalErrors = recentErrors.length;
    const errorsPerMinute = totalErrors / (timeWindowMs / 60000);

    return {
      totalErrors,
      errorsPerMinute: Math.round(errorsPerMinute * 100) / 100,
      retryableErrors,
      nonRetryableErrors,
    };
  }
}

// Export singleton instance
export const powerSyncErrorMonitor = PowerSyncErrorMonitor.getInstance();

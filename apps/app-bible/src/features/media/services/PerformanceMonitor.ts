import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private thresholds = {
    playLatency: 1000, // 1 second max
    queueBuild: 500, // 500ms max
    trackSwitch: 200, // 200ms max
    hookUpdate: 100, // 100ms max for hook updates
    firstTrack: 100, // 100ms max for first track load
    metadataBuild: 200, // 200ms max for metadata build
    initialWindow: 300, // 300ms max for initial window
  };

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
      logger.info(
        ENABLE_LOGGING,
        '[PerformanceMonitor] Instance created - tracking performance metrics'
      );
    }
    return this.instance;
  }

  startTiming(operation: string): number {
    const startTime = Date.now();
    logger.debug(
      ENABLE_LOGGING,
      `[PerformanceMonitor] Starting timing: ${operation}`
    );
    return startTime;
  }

  endTiming(operation: string, startTime: number): number {
    const duration = Date.now() - startTime;

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);

    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }

    // Log if exceeds threshold
    const threshold =
      this.thresholds[operation as keyof typeof this.thresholds];
    if (threshold && duration > threshold) {
      logger.warn(
        ENABLE_LOGGING,
        `[PerformanceMonitor] ⚠️ ${operation} took ${duration}ms (threshold: ${threshold}ms) - SLOW!`
      );
    } else {
      logger.info(
        ENABLE_LOGGING,
        `[PerformanceMonitor] ✅ ${operation} completed in ${duration}ms`
      );
    }

    return duration;
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  getP95Time(operation: string): number {
    const times = this.metrics.get(operation) || [];
    if (times.length === 0) return 0;

    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }

  logReport(): void {
    logger.info(ENABLE_LOGGING, '\n=== 📊 Performance Report ===');
    for (const [operation, times] of this.metrics) {
      if (times.length > 0) {
        const avg = this.getAverageTime(operation);
        const p95 = this.getP95Time(operation);
        const threshold =
          this.thresholds[operation as keyof typeof this.thresholds];
        const status = threshold && avg > threshold ? '🔴 SLOW' : '✅ GOOD';

        logger.info(ENABLE_LOGGING, `${operation} ${status}:`);
        logger.info(ENABLE_LOGGING, `  Average: ${avg.toFixed(2)}ms`);
        logger.info(ENABLE_LOGGING, `  P95: ${p95.toFixed(2)}ms`);
        logger.info(ENABLE_LOGGING, `  Samples: ${times.length}`);
        if (threshold) {
          logger.info(ENABLE_LOGGING, `  Threshold: ${threshold}ms`);
        }
      }
    }
    logger.info(ENABLE_LOGGING, '========================\n');
  }

  // Add custom thresholds for specific operations
  setThreshold(operation: string, thresholdMs: number): void {
    this.thresholds[operation as keyof typeof this.thresholds] = thresholdMs;
    logger.info(
      ENABLE_LOGGING,
      `[PerformanceMonitor] Threshold set: ${operation} = ${thresholdMs}ms`
    );
  }

  // Check if operation consistently exceeds threshold
  isOperationSlow(operation: string): boolean {
    const times = this.metrics.get(operation) || [];
    const threshold =
      this.thresholds[operation as keyof typeof this.thresholds];

    if (!threshold || times.length < 3) return false;

    // Consider slow if last 3 measurements exceed threshold
    const recentTimes = times.slice(-3);
    return recentTimes.every(time => time > threshold);
  }
}

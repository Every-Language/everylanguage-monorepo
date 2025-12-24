import { useState, useEffect } from 'react';
import { queryLogger } from '@/shared/utils/queryLogger';

// Global declaration for React Native __DEV__ variable
declare const __DEV__: boolean;

export interface QueryPerformanceInfo {
  totalQueries: number;
  slowQueries: number;
  averageTime: number;
  activeQueries: number;
  isHealthy: boolean;
  recentQueries: Array<{
    context: string;
    duration: number;
    query: string;
    timestamp: number;
  }>;
}

export const useQueryPerformance = () => {
  const [performance, setPerformance] = useState<QueryPerformanceInfo>({
    totalQueries: 0,
    slowQueries: 0,
    averageTime: 0,
    activeQueries: 0,
    isHealthy: true,
    recentQueries: [],
  });

  useEffect(() => {
    if (!__DEV__) return;

    const updatePerformance = () => {
      const perf = queryLogger.getRecentPerformance();
      setPerformance({
        totalQueries: perf.totalQueries,
        slowQueries: perf.slowQueries,
        averageTime: perf.averageTime,
        activeQueries: perf.activeQueries,
        isHealthy: perf.slowQueries === 0 && perf.averageTime < 1000,
        recentQueries: perf.recentQueries.map(q => ({
          context: q.context,
          duration: q.duration || 0,
          query: q.query,
          timestamp: q.startTime,
        })),
      });
    };

    updatePerformance();
    const interval = setInterval(updatePerformance, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return performance;
};

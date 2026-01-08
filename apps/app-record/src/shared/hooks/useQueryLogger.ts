import { useRef, useCallback, useMemo } from 'react';
import { queryLogger } from '@/shared/utils/queryLogger';

/**
 * Robust hook for logging query start/end times with memoization
 * Usage: const logQuery = useQueryLogger('MyHook');
 */
export const useQueryLogger = (context: string) => {
  const activeQueries = useRef<Map<string, string>>(new Map());
  const contextRef = useRef(context);

  // Update context ref when it changes
  if (contextRef.current !== context) {
    contextRef.current = context;
  }

  const logQueryStart = useCallback(
    (query: string, customId?: string): string => {
      const id = queryLogger.logQueryStart(contextRef.current, query, customId);
      if (id) {
        activeQueries.current.set(id, query);
      }
      return id;
    },
    []
  );

  const logQueryEnd = useCallback(
    (id: string, resultCount?: number, error?: string): void => {
      queryLogger.logQueryEnd(id, resultCount, error);
      activeQueries.current.delete(id);
    },
    []
  );

  // Enhanced result count detection
  const getResultCount = useCallback((result: unknown): number | undefined => {
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
  }, []);

  const logQuery = useCallback(
    async <T>(
      query: string,
      queryFn: () => Promise<T>,
      customId?: string
    ): Promise<T> => {
      const id = logQueryStart(query, customId);
      let resultCount: number | undefined;
      let error: string | undefined;

      try {
        const result = await queryFn();

        // Enhanced result count detection
        resultCount = getResultCount(result);
        return result;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        logQueryEnd(id, resultCount, error);
      }
    },
    [logQueryStart, logQueryEnd, getResultCount]
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      logQueryStart,
      logQueryEnd,
      logQuery,
    }),
    [logQueryStart, logQueryEnd, logQuery]
  );
};

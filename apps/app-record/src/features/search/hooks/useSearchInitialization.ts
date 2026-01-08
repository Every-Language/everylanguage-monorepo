import { useEffect, useState } from 'react';
import { searchIndexService } from '../services/SearchIndexService';
import { logger } from '@/shared/utils/logger';

const ENABLE_LOGGING = true;

export const useSearchInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSearch = async () => {
      if (isInitialized || isInitializing) {
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        logger.debug(ENABLE_LOGGING, 'Starting PowerSync FTS initialization');

        await searchIndexService.initializeFTS();

        setIsInitialized(true);
        logger.info(ENABLE_LOGGING, 'PowerSync FTS initialization complete');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize search';
        logger.error(
          ENABLE_LOGGING,
          'PowerSync FTS initialization failed',
          err
        );
        setError(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSearch();
  }, [isInitialized, isInitializing]);

  return {
    isInitialized,
    isInitializing,
    error,
    retry: () => {
      setIsInitialized(false);
      setError(null);
    },
  };
};

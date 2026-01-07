import { useState, useEffect } from 'react';
import { logger } from '@/shared/utils/logger';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';

// Logging configuration for this module
const ENABLE_LOGGING = false;

export const useDatabaseStatus = () => {
  const [databaseStatus, setDatabaseStatus] = useState<
    'checking' | 'ready' | 'error' | 'initializing'
  >('checking');
  const [databaseProgress, setDatabaseProgress] = useState<{
    stage: string;
    message: string;
    progress: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDatabaseStatus = async () => {
    try {
      setDatabaseStatus('checking');
      setError(null);

      // If already initialized, mark ready
      if (powerSyncSystem.isInitialized) {
        setDatabaseStatus('ready');
        return;
      }

      setDatabaseStatus('initializing');
      setDatabaseProgress({
        stage: 'initialize',
        message: 'Initializing database…',
        progress: 20,
      });

      await powerSyncSystem.initialize();
      // Do not attempt to connect here; connection manager handles it elsewhere
      setDatabaseStatus('ready');
      setDatabaseProgress(null);
    } catch (e) {
      setDatabaseStatus('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
      setDatabaseProgress(null);
    }
  };

  const verifyDatabase = async () => {
    try {
      if (powerSyncSystem.isInitialized) {
        setDatabaseStatus('ready');
        setError(null);
      } else {
        setDatabaseStatus('error');
        setError('Database is not properly initialized');
      }
    } catch (e) {
      logger.error(
        ENABLE_LOGGING,
        'OnboardingMainScreen: Database verification error:',
        e
      );
      setDatabaseStatus('error');
      setError(e instanceof Error ? e.message : 'Verification failed');
    }
  };

  const handleRetryDatabase = () => {
    checkDatabaseStatus();
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return {
    databaseStatus,
    databaseProgress,
    error,
    checkDatabaseStatus,
    verifyDatabase,
    handleRetryDatabase,
  };
};

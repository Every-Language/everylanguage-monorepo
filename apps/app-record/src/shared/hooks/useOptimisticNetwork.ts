import { useCallback, useState } from 'react';
import { useNetworkStore } from '@/shared/store/networkStore';
import { networkErrorClassifier } from '@/shared/services/network/NetworkErrorClassifier';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface UseOptimisticNetworkReturn {
  isOnline: boolean;
  isChecking: boolean;
  executeWithNetworkCheck: <T>(
    action: () => Promise<T>,
    options?: {
      onNetworkError?: () => void;
      onRetry?: () => void;
      maxRetries?: number;
    }
  ) => Promise<T>;
  checkConnectivity: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Optimistic Network Hook
 * Executes actions optimistically and only checks network connectivity when actions fail with network errors
 */
export const useOptimisticNetwork = (): UseOptimisticNetworkReturn => {
  const { capabilities, checkOnlineCapabilities, clearError } =
    useNetworkStore();
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Check network connectivity
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const isOnline = await checkOnlineCapabilities();
      logger.debug(
        ENABLE_LOGGING,
        'OptimisticNetwork: Connectivity check result:',
        isOnline
      );
      return isOnline;
    } finally {
      setIsChecking(false);
    }
  }, [checkOnlineCapabilities]);

  /**
   * Execute action with optimistic network checking
   * Only checks connectivity when action fails with network error
   */
  const executeWithNetworkCheck = useCallback(
    async <T>(
      action: () => Promise<T>,
      options: {
        onNetworkError?: () => void;
        onRetry?: () => void;
        maxRetries?: number;
      } = {}
    ): Promise<T> => {
      const { onNetworkError, onRetry, maxRetries = 1 } = options;
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Execute the action optimistically
          return await action();
        } catch (error) {
          lastError = error;

          // Check if this is a network-related error
          const isNetworkError = networkErrorClassifier.isNetworkError(error);

          if (isNetworkError) {
            logger.debug(
              ENABLE_LOGGING,
              `OptimisticNetwork: Network error detected on attempt ${attempt + 1}:`,
              error
            );

            // Check connectivity when network error occurs
            const isOnline = await checkConnectivity();

            if (!isOnline) {
              // Network is actually offline
              logger.debug(
                ENABLE_LOGGING,
                'OptimisticNetwork: Network confirmed offline'
              );

              if (onNetworkError) {
                onNetworkError();
              }

              // Don't retry if network is confirmed offline
              throw error;
            } else {
              // Network is online, this might be a temporary issue
              logger.debug(
                ENABLE_LOGGING,
                'OptimisticNetwork: Network is online, retrying action'
              );

              if (onRetry) {
                onRetry();
              }

              // If this is the last attempt, throw the error
              if (attempt === maxRetries) {
                throw error;
              }

              // Wait before retry (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else {
            // Not a network error, don't retry
            logger.debug(
              ENABLE_LOGGING,
              'OptimisticNetwork: Non-network error, not retrying:',
              error
            );
            throw error;
          }
        }
      }

      // If we get here, all retries failed
      throw lastError;
    },
    [checkConnectivity]
  );

  return {
    isOnline: capabilities.isOnline,
    isChecking: isChecking || capabilities.isChecking,
    executeWithNetworkCheck,
    checkConnectivity,
    clearError,
  };
};

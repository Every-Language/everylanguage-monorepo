import { useNetworkStore } from '../store/networkStore';
import { useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Hook to access basic network state from the centralized store
 */
export const useNetworkState = () => {
  const { networkState } = useNetworkStore();
  return networkState;
};

/**
 * Hook to access network capabilities (online testing) from the centralized store
 */
export const useNetworkCapabilities = () => {
  const {
    capabilities,
    checkOnlineCapabilities,
    retryOnlineCheck,
    clearError,
  } = useNetworkStore();

  // Trigger initial check if not checked yet and network appears available
  useEffect(() => {
    if (
      capabilities.lastChecked === null &&
      !capabilities.isChecking &&
      !capabilities.isOnline
    ) {
      // Small delay to ensure store is initialized
      const timer = setTimeout(() => {
        checkOnlineCapabilities();
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    capabilities.lastChecked,
    capabilities.isChecking,
    capabilities.isOnline,
    checkOnlineCapabilities,
  ]);

  return {
    ...capabilities,
    checkOnlineCapabilities,
    retryOnlineCheck,
    clearError,
  };
};

/**
 * Hook to access both network state and capabilities
 */
export const useNetwork = () => {
  const {
    networkState,
    capabilities,
    checkOnlineCapabilities,
    retryOnlineCheck,
    clearError,
  } = useNetworkStore();

  // Trigger initial check if not checked yet and network appears available
  useEffect(() => {
    if (
      capabilities.lastChecked === null &&
      !capabilities.isChecking &&
      !capabilities.isOnline &&
      networkState.isConnected &&
      networkState.isInternetReachable !== false
    ) {
      // Small delay to ensure store is initialized
      const timer = setTimeout(() => {
        checkOnlineCapabilities();
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    capabilities.lastChecked,
    capabilities.isChecking,
    capabilities.isOnline,
    networkState.isConnected,
    networkState.isInternetReachable,
    checkOnlineCapabilities,
  ]);

  return {
    // Network state
    isConnected: networkState.isConnected,
    connectionType: networkState.connectionType,
    isInternetReachable: networkState.isInternetReachable,

    // Capabilities
    isOnline: capabilities.isOnline,
    isChecking: capabilities.isChecking,
    lastChecked: capabilities.lastChecked,
    error: capabilities.error,

    // Actions
    checkOnlineCapabilities,
    retryOnlineCheck,
    clearError,
  };
};

/**
 * Hook to ensure network is available before critical actions
 * This hook will automatically check network capabilities if not already checked
 */
export const useNetworkForAction = () => {
  const { capabilities, checkOnlineCapabilities, retryOnlineCheck } =
    useNetworkStore();

  const ensureNetworkAvailable = useCallback(
    async (action: () => Promise<void> | void) => {
      // If we haven't checked network capabilities yet, check them first
      if (capabilities.lastChecked === null) {
        logger.debug(
          ENABLE_LOGGING,
          'NetworkForAction: No network check performed yet, checking now...'
        );
        await checkOnlineCapabilities();
      }

      // If network is not available, throw an error
      if (!capabilities.isOnline) {
        throw new Error(
          'Network is not available. Please check your internet connection and try again.'
        );
      }

      // Execute the action
      return action();
    },
    [capabilities.lastChecked, capabilities.isOnline, checkOnlineCapabilities]
  );

  const retryAndExecute = useCallback(
    async (action: () => Promise<void> | void) => {
      logger.debug(
        ENABLE_LOGGING,
        'NetworkForAction: Retrying network check and executing action...'
      );
      const isOnline = await retryOnlineCheck();

      if (!isOnline) {
        throw new Error(
          'Network is not available after retry. Please check your internet connection and try again.'
        );
      }

      return action();
    },
    [retryOnlineCheck]
  );

  return {
    isOnline: capabilities.isOnline,
    isChecking: capabilities.isChecking,
    ensureNetworkAvailable,
    retryAndExecute,
  };
};

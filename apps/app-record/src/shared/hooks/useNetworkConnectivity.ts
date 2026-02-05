import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { logger } from '@/shared/utils/logger';

export interface NetworkConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  isInitialized: boolean;
}

/**
 * Hook for monitoring network connectivity
 *
 * Provides real-time network state information and helper methods
 * to check connectivity before making network requests.
 */
export const useNetworkConnectivity = () => {
  const [state, setState] = useState<NetworkConnectivityState>({
    isConnected: true, // Optimistic default
    isInternetReachable: null,
    connectionType: null,
    isInitialized: false,
  });

  useEffect(() => {
    // Get initial network state
    const fetchInitialState = async (): Promise<void> => {
      try {
        const netInfoState = await NetInfo.fetch();
        setState({
          isConnected: netInfoState.isConnected ?? false,
          isInternetReachable: netInfoState.isInternetReachable,
          connectionType: netInfoState.type,
          isInitialized: true,
        });
      } catch (error) {
        logger.error('Failed to fetch initial network state:', error);
        setState(prev => ({ ...prev, isInitialized: true }));
      }
    };

    void fetchInitialState();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(
      (netInfoState: NetInfoState) => {
        setState({
          isConnected: netInfoState.isConnected ?? false,
          isInternetReachable: netInfoState.isInternetReachable,
          connectionType: netInfoState.type,
          isInitialized: true,
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Check if network is available for making requests
   * Returns true if connected and internet is reachable (or reachability is unknown)
   */
  const isNetworkAvailable = useCallback((): boolean => {
    return (
      state.isConnected &&
      (state.isInternetReachable === true || state.isInternetReachable === null)
    );
  }, [state.isConnected, state.isInternetReachable]);

  /**
   * Refresh network state manually
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const netInfoState = await NetInfo.fetch();
      setState({
        isConnected: netInfoState.isConnected ?? false,
        isInternetReachable: netInfoState.isInternetReachable,
        connectionType: netInfoState.type,
        isInitialized: true,
      });
    } catch (error) {
      logger.error('Failed to refresh network state:', error);
    }
  }, []);

  return {
    ...state,
    isNetworkAvailable,
    refresh,
  };
};

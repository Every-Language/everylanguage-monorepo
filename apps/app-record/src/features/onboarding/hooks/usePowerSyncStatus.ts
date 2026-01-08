import { useState, useEffect, useCallback } from 'react';
import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { powerSyncConnectionManager } from '@/shared/services/powersync/PowerSyncConnectionManager';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export interface PowerSyncStatus {
  initialized: boolean;
  connected: boolean;
  connecting: boolean;
  connectionMethod: string | null;
  syncStatus: string | null;
  error: string | null;
}

/**
 * Hook to monitor PowerSync sync status
 * Combines status from PowerSyncSystem and PowerSyncConnectionManager
 */
export const usePowerSyncStatus = (): PowerSyncStatus => {
  const [status, setStatus] = useState<PowerSyncStatus>({
    initialized: false,
    connected: false,
    connecting: false,
    connectionMethod: null,
    syncStatus: null,
    error: null,
  });

  const updateStatus = useCallback(() => {
    try {
      const systemStatus = powerSyncSystem.getStatus();
      const connectionState = powerSyncConnectionManager.getState();

      setStatus({
        initialized: systemStatus.initialized,
        connected: systemStatus.connected && connectionState.isConnected,
        connecting: connectionState.isConnecting,
        connectionMethod: systemStatus.connectionMethod,
        syncStatus: systemStatus.status as string | null,
        error: connectionState.connectionError,
      });
    } catch (error) {
      logger.warn(
        ENABLE_LOGGING,
        'usePowerSyncStatus: Failed to get status',
        error
      );
    }
  }, []);

  useEffect(() => {
    // Initial status check
    updateStatus();

    // Subscribe to connection state changes
    const unsubscribe = powerSyncConnectionManager.subscribe(() => {
      updateStatus();
    });

    // Poll PowerSync status periodically (every 2 seconds)
    // This ensures we catch status changes that might not trigger connection manager updates
    const intervalId = setInterval(() => {
      updateStatus();
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [updateStatus]);

  return status;
};

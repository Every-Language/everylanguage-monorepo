import { useState, useEffect } from 'react';
import { useStatus, usePowerSync } from '@powersync/react';

/**
 * Hook for tracking PowerSync connection and sync status
 *
 * Provides reactive status updates for:
 * - Connection state
 * - Sync completion state
 * - Last sync timestamp
 *
 * Handles cleanup of listeners automatically.
 */
export const usePowerSyncStatus = () => {
  const powerSync = usePowerSync();
  const status = useStatus();

  const [isConnected, setIsConnected] = useState<boolean>(
    powerSync?.connected ?? status.connected ?? false
  );
  const [hasSynced, setHasSynced] = useState<boolean>(
    powerSync?.currentStatus?.hasSynced ?? status.hasSynced ?? false
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(
    status.lastSyncedAt ? new Date(status.lastSyncedAt) : null
  );

  useEffect(() => {
    if (!powerSync) {
      return;
    }

    // Set initial values
    setIsConnected(powerSync.connected);
    setHasSynced(powerSync.currentStatus?.hasSynced ?? false);
    setLastSyncedAt(
      powerSync.currentStatus?.lastSyncedAt
        ? new Date(powerSync.currentStatus.lastSyncedAt)
        : null
    );

    // Register listener for status changes
    const unsubscribe = powerSync.registerListener({
      statusChanged: newStatus => {
        setIsConnected(powerSync.connected);
        setHasSynced(newStatus.hasSynced ?? false);
        setLastSyncedAt(
          newStatus.lastSyncedAt ? new Date(newStatus.lastSyncedAt) : null
        );
      },
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, [powerSync]);

  return {
    isConnected,
    hasSynced,
    lastSyncedAt,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { permissionsService } from '../services/PermissionsService';
import { logger } from '@/shared/utils/logger';
import {
  PermissionsState,
  PermissionStatus,
  UsePermissionsReturn,
} from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const usePermissions = (): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<PermissionsState>({
    notifications: {
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
    },
    audio: { granted: false, canAskAgain: true, status: 'undetermined' },
    storage: { granted: false, canAskAgain: true, status: 'undetermined' },
    backgroundSync: {
      granted: false,
      canAskAgain: true,
      status: 'undetermined',
    },
    location: { granted: false, canAskAgain: true, status: 'undetermined' },
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize permissions on mount
  useEffect(() => {
    const initializePermissions = async () => {
      try {
        setIsLoading(true);
        await permissionsService.initialize();
        const currentPermissions = permissionsService.getPermissionsState();
        setPermissions(currentPermissions);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to initialize permissions:',
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializePermissions();
  }, []);

  // Request all permissions
  const requestAllPermissions =
    useCallback(async (): Promise<PermissionsState> => {
      try {
        setIsLoading(true);
        const result = await permissionsService.requestAllPermissions();
        setPermissions(result);
        return result;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to request all permissions:',
          error
        );
        return permissions;
      } finally {
        setIsLoading(false);
      }
    }, [permissions]);

  // Request notification permissions specifically
  const requestNotificationPermissions =
    useCallback(async (): Promise<PermissionStatus> => {
      try {
        const result =
          await permissionsService.requestNotificationPermissions();
        setPermissions(prev => ({
          ...prev,
          notifications: result,
        }));
        return result;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to request notification permissions:',
          error
        );
        return permissions.notifications;
      }
    }, [permissions.notifications]);

  // Request location permissions specifically
  const requestLocationPermissions =
    useCallback(async (): Promise<PermissionStatus> => {
      try {
        const result = await permissionsService.requestLocationPermissions();
        setPermissions(prev => ({
          ...prev,
          location: result,
        }));
        return result;
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Failed to request location permissions:',
          error
        );
        return permissions.location;
      }
    }, [permissions.location]);

  // Check all permissions
  const checkAllPermissions =
    useCallback(async (): Promise<PermissionsState> => {
      try {
        setIsLoading(true);
        const result = await permissionsService.checkAllPermissions();
        setPermissions(result);
        return result;
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Failed to check all permissions:', error);
        return permissions;
      } finally {
        setIsLoading(false);
      }
    }, [permissions]);

  // Check if critical permissions are granted
  const areCriticalPermissionsGranted = useCallback((): boolean => {
    return permissionsService.areCriticalPermissionsGranted();
  }, []);

  // Show permission explanation
  const showPermissionExplanation = useCallback(
    (permissionType: keyof PermissionsState): void => {
      permissionsService.showPermissionExplanation(permissionType);
    },
    []
  );

  // Open app settings
  const openAppSettings = useCallback(async (): Promise<void> => {
    await permissionsService.openAppSettings();
  }, []);

  return {
    permissions,
    isLoading,
    requestAllPermissions,
    requestNotificationPermissions,
    requestLocationPermissions,
    checkAllPermissions,
    areCriticalPermissionsGranted,
    showPermissionExplanation,
    openAppSettings,
  };
};

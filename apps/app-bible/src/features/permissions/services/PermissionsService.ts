import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import { Alert, Linking } from 'react-native';
import { i18n } from '@/shared/services';
import { logger } from '@/shared/utils/logger';
import { PermissionStatus, PermissionsState } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export class PermissionsService {
  private static instance: PermissionsService;
  private permissionsState: PermissionsState = {
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
  };

  private constructor() {}

  static getInstance(): PermissionsService {
    if (!PermissionsService.instance) {
      PermissionsService.instance = new PermissionsService();
    }
    return PermissionsService.instance;
  }

  /**
   * Initialize permissions service and check current status
   */
  async initialize(): Promise<void> {
    try {
      await this.checkAllPermissions();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to initialize permissions service:',
        error
      );
    }
  }

  /**
   * Check all permissions and update state
   */
  async checkAllPermissions(): Promise<PermissionsState> {
    try {
      const [notifications, audio, storage, backgroundSync, location] =
        await Promise.all([
          this.checkNotificationPermissions(),
          this.checkAudioPermissions(),
          this.checkStoragePermissions(),
          this.checkBackgroundSyncPermissions(),
          this.checkLocationPermissions(),
        ]);

      this.permissionsState = {
        notifications,
        audio,
        storage,
        backgroundSync,
        location,
      };

      return this.permissionsState;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to check permissions:', error);
      return this.permissionsState;
    }
  }

  /**
   * Check notification permissions
   */
  async checkNotificationPermissions(): Promise<PermissionStatus> {
    try {
      const permissionResponse = await Notifications.getPermissionsAsync();

      const status: PermissionStatus = {
        granted:
          permissionResponse.granted || permissionResponse.status === 'granted',
        canAskAgain:
          permissionResponse.canAskAgain &&
          permissionResponse.status !== 'denied',
        status: permissionResponse.status,
      };

      return status;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check notification permissions:',
        error
      );
      return { granted: false, canAskAgain: false, status: 'denied' };
    }
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions(): Promise<PermissionStatus> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();

      const permissionStatus: PermissionStatus = {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status,
      };

      this.permissionsState.notifications = permissionStatus;

      return permissionStatus;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to request notification permissions:',
        error
      );
      return { granted: false, canAskAgain: false, status: 'denied' };
    }
  }

  /**
   * Request location permissions
   */
  async requestLocationPermissions(): Promise<PermissionStatus> {
    try {
      // Import location service dynamically to avoid circular dependencies
      const { locationService } =
        await import('@/shared/services/location/LocationService');

      const permissionStatus = await locationService.requestPermissions();

      const status: PermissionStatus = {
        granted: permissionStatus.granted,
        canAskAgain: permissionStatus.canAskAgain,
        status: permissionStatus.status === 'granted' ? 'granted' : 'denied',
      };

      this.permissionsState.location = status;

      return status;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to request location permissions:',
        error
      );
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Check audio permissions (mainly for background playback)
   */
  async checkAudioPermissions(): Promise<PermissionStatus> {
    try {
      // Audio playback permissions are generally granted by default
      // No explicit permissions needed for basic audio playback
      const status: PermissionStatus = {
        granted: true, // Audio playback is always available
        canAskAgain: false, // No need to ask since it's always granted
        status: 'granted',
      };

      return status;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to check audio permissions:', error);
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Check storage permissions
   */
  async checkStoragePermissions(): Promise<PermissionStatus> {
    try {
      // In Expo managed workflow, file system access is generally granted
      // We check if we can access the document directory
      const canAccess = await this.canAccessFileSystem();

      const status: PermissionStatus = {
        granted: canAccess,
        canAskAgain: true,
        status: canAccess ? 'granted' : 'denied',
      };

      return status;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check storage permissions:',
        error
      );
      // In development builds, assume storage is available
      return { granted: true, canAskAgain: true, status: 'granted' };
    }
  }

  /**
   * Check if we can access the file system
   */
  private async canAccessFileSystem(): Promise<boolean> {
    try {
      // Try to access the document directory
      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        return false;
      }
      const dirInfo = await FileSystem.getInfoAsync(documentDirectory);
      return dirInfo.exists;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check file system access:',
        error
      );
      return false;
    }
  }

  /**
   * Check background sync permissions
   */
  async checkBackgroundSyncPermissions(): Promise<PermissionStatus> {
    try {
      // Background sync permissions depend on the platform and app state
      const isSupported = await this.isBackgroundSyncSupported();

      const status: PermissionStatus = {
        granted: isSupported,
        canAskAgain: true,
        status: isSupported ? 'granted' : 'denied',
      };

      return status;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check background sync permissions:',
        error
      );
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Check location permissions
   */
  async checkLocationPermissions(): Promise<PermissionStatus> {
    try {
      // Import location service dynamically to avoid circular dependencies
      const { locationService } =
        await import('@/shared/services/location/LocationService');
      const permissionStatus = await locationService.checkPermissionStatus();

      const status: PermissionStatus = {
        granted: permissionStatus.granted,
        canAskAgain: permissionStatus.canAskAgain,
        status: permissionStatus.status === 'granted' ? 'granted' : 'denied',
      };

      return status;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check location permissions:',
        error
      );
      // In development builds, assume location is not critical
      return { granted: false, canAskAgain: true, status: 'denied' };
    }
  }

  /**
   * Check if background sync is supported
   */
  private async isBackgroundSyncSupported(): Promise<boolean> {
    try {
      // Check if TaskManager is available
      await TaskManager.getRegisteredTasksAsync();

      // Background sync is supported if we can register tasks
      return true;
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Failed to check background sync support:',
        error
      );
      return false;
    }
  }

  /**
   * Request all necessary permissions
   */
  async requestAllPermissions(): Promise<PermissionsState> {
    try {
      const [notifications, audio, storage, backgroundSync, location] =
        await Promise.all([
          this.requestNotificationPermissions(),
          this.checkAudioPermissions(), // Audio permissions are generally granted
          this.checkStoragePermissions(), // Storage permissions are generally granted
          this.checkBackgroundSyncPermissions(), // Background sync depends on build type
          this.checkLocationPermissions(), // Location permissions
        ]);

      this.permissionsState = {
        notifications,
        audio,
        storage,
        backgroundSync,
        location,
      };

      return this.permissionsState;
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to request all permissions:', error);
      return this.permissionsState;
    }
  }

  /**
   * Get current permissions state
   */
  getPermissionsState(): PermissionsState {
    return { ...this.permissionsState };
  }

  /**
   * Check if all critical permissions are granted
   */
  areCriticalPermissionsGranted(): boolean {
    const { notifications, audio, storage } = this.permissionsState;
    return notifications.granted && audio.granted && storage.granted;
  }

  /**
   * Show permission explanation dialog
   */
  showPermissionExplanation(permissionType: keyof PermissionsState): void {
    const explanations = {
      notifications: {
        title: i18n.t('permissions.explain.notifications.title'),
        message: i18n.t('permissions.explain.notifications.message'),
        settingsKey: 'notifications',
      },
      audio: {
        title: i18n.t('permissions.explain.audio.title'),
        message: i18n.t('permissions.explain.audio.message'),
        settingsKey: 'audio',
      },
      storage: {
        title: i18n.t('permissions.explain.storage.title'),
        message: i18n.t('permissions.explain.storage.message'),
        settingsKey: 'storage',
      },
      backgroundSync: {
        title: i18n.t('permissions.explain.backgroundSync.title'),
        message: i18n.t('permissions.explain.backgroundSync.message'),
        settingsKey: 'backgroundSync',
      },
      location: {
        title: i18n.t('permissions.explain.location.title'),
        message: i18n.t('permissions.explain.location.message'),
        settingsKey: 'location',
      },
    };

    const explanation = explanations[permissionType];

    Alert.alert(explanation.title, explanation.message, [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('common.settings'),
        onPress: () => this.openAppSettings(),
      },
    ]);
  }

  /**
   * Open app settings
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Failed to open app settings:', error);
    }
  }

  /**
   * Check if a specific permission is granted
   */
  isPermissionGranted(permissionType: keyof PermissionsState): boolean {
    return this.permissionsState[permissionType].granted;
  }

  /**
   * Check if a specific permission can be asked again
   */
  canAskPermissionAgain(permissionType: keyof PermissionsState): boolean {
    return this.permissionsState[permissionType].canAskAgain;
  }
}

// Export singleton instance
export const permissionsService = PermissionsService.getInstance();

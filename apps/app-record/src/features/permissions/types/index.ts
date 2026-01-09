export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'blocked';
}

export interface PermissionsState {
  notifications: PermissionStatus;
  audio: PermissionStatus;
  storage: PermissionStatus;
  backgroundSync: PermissionStatus;
  location: PermissionStatus;
}

export interface UsePermissionsReturn {
  permissions: PermissionsState;
  isLoading: boolean;
  requestAllPermissions: () => Promise<PermissionsState>;
  requestNotificationPermissions: () => Promise<PermissionStatus>;
  requestLocationPermissions: () => Promise<PermissionStatus>;
  checkAllPermissions: () => Promise<PermissionsState>;
  areCriticalPermissionsGranted: () => boolean;
  showPermissionExplanation: (permissionType: keyof PermissionsState) => void;
  openAppSettings: () => Promise<void>;
}

export type PermissionType =
  | 'notifications'
  | 'audio'
  | 'storage'
  | 'backgroundSync'
  | 'location';

export interface PermissionCardProps {
  title: string;
  description: string;
  granted: boolean;
  canAskAgain: boolean;
  onRequestPress: () => void;
  onSettingsPress: () => void;
  permissionType: PermissionType;
}

export interface PermissionsScreenProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack?: () => void;
}

/**
 * Settings feature types and interfaces
 */

export interface MediaSettings {
  /** Auto-expand media player when playing from outside the sheet */
  autoOpenOnPlay: boolean;
}

export interface AppSettings {
  /** Media player related settings */
  media: MediaSettings;
}

export interface SettingsState {
  /** Current app settings */
  settings: AppSettings;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: string | null;
}

export interface SettingsActions {
  /** Update media settings */
  updateMediaSettings: (settings: Partial<MediaSettings>) => void;

  /** Reset settings to defaults */
  resetToDefaults: () => void;

  /** Clear error state */
  clearError: () => void;

  /** Set loading state */
  setLoading: (loading: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

/**
 * Component prop types
 */
export interface SettingsToggleProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
  media: {
    autoOpenOnPlay: true,
  },
};

/**
 * Settings storage keys
 */
export const SETTINGS_STORAGE_KEYS = {
  MEDIA_SETTINGS: 'media-settings',
  APP_SETTINGS: 'app-settings',
} as const;

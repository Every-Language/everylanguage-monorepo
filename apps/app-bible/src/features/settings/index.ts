/**
 * Settings feature exports
 */

// Store
export { useSettingsStore, useMediaSettingsStore } from './store/settingsStore';
export {
  useMediaSettings,
  useAutoOpenOnPlay,
  useSettingsActions,
  useSettingsState,
} from './store/settingsStore';

// Services
export { settingsService, SettingsService } from './services/settingsService';

// Hooks
export { useSettings } from './hooks/useSettings';

// Components
export { SettingsToggle, MediaSettingsSection } from './components';

// Screens
export { SettingsScreen } from './screens';

// Types
export type {
  MediaSettings,
  AppSettings,
  SettingsState,
  SettingsActions,
  SettingsStore,
  SettingsToggleProps,
} from './types';

// Utils
export {
  validateMediaSettings,
  getSettingsWithDefaults,
  isSettingModified,
  exportSettings,
} from './utils';

// Navigation
export { SettingsStackNavigator } from './navigation';

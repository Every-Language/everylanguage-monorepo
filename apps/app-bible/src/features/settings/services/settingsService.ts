import { logger } from '@/shared/utils/logger';
import { useSettingsStore } from '../store/settingsStore';
import type { MediaSettings, AppSettings } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Settings service for managing app settings
 * Provides a service layer for settings operations
 */
export class SettingsService {
  private static instance: SettingsService;

  /**
   * Get singleton instance
   */
  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  /**
   * Get current media settings
   */
  public getMediaSettings(): MediaSettings {
    const store = useSettingsStore.getState();
    return store.settings.media;
  }

  /**
   * Update media settings
   */
  public updateMediaSettings(settings: Partial<MediaSettings>): void {
    try {
      const store = useSettingsStore.getState();
      store.updateMediaSettings(settings);

      logger.info(
        ENABLE_LOGGING,
        '[SettingsService] Updated media settings:',
        settings
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[SettingsService] Failed to update media settings:',
        error
      );
      throw error;
    }
  }

  /**
   * Get auto-open setting
   */
  public getAutoOpenOnPlay(): boolean {
    const mediaSettings = this.getMediaSettings();
    return mediaSettings.autoOpenOnPlay;
  }

  /**
   * Set auto-open setting
   */
  public setAutoOpenOnPlay(value: boolean): void {
    this.updateMediaSettings({ autoOpenOnPlay: value });
  }

  /**
   * Reset all settings to defaults
   */
  public resetToDefaults(): void {
    try {
      const store = useSettingsStore.getState();
      store.resetToDefaults();

      logger.info(
        ENABLE_LOGGING,
        '[SettingsService] Reset settings to defaults'
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[SettingsService] Failed to reset settings:',
        error
      );
      throw error;
    }
  }

  /**
   * Get all app settings
   */
  public getAllSettings(): AppSettings {
    const store = useSettingsStore.getState();
    return store.settings;
  }

  /**
   * Check if settings are loading
   */
  public isLoading(): boolean {
    const store = useSettingsStore.getState();
    return store.isLoading;
  }

  /**
   * Get current error state
   */
  public getError(): string | null {
    const store = useSettingsStore.getState();
    return store.error;
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    const store = useSettingsStore.getState();
    store.clearError();
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance();

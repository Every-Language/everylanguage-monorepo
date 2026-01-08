import { logger } from '@/shared/utils/logger';
import { settingsService } from '../services/settingsService';
import type { MediaSettings } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Utility functions for settings management
 */

/**
 * Validate media settings
 */
export const validateMediaSettings = (
  settings: Partial<MediaSettings>
): boolean => {
  try {
    // Validate autoOpenOnPlay
    if (
      settings.autoOpenOnPlay !== undefined &&
      typeof settings.autoOpenOnPlay !== 'boolean'
    ) {
      logger.warn(
        ENABLE_LOGGING,
        '[SettingsUtils] Invalid autoOpenOnPlay value:',
        settings.autoOpenOnPlay
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      '[SettingsUtils] Error validating media settings:',
      error
    );
    return false;
  }
};

/**
 * Get settings with fallback to defaults
 */
export const getSettingsWithDefaults = () => {
  try {
    const settings = settingsService.getAllSettings();
    return settings;
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      '[SettingsUtils] Error getting settings, using defaults:',
      error
    );
    // Return default settings if there's an error
    return settingsService.getAllSettings();
  }
};

/**
 * Check if a setting has been modified from default
 */
export const isSettingModified = (
  key: keyof MediaSettings,
  value: unknown
): boolean => {
  try {
    const currentSettings = settingsService.getMediaSettings();
    return currentSettings[key] !== value;
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      '[SettingsUtils] Error checking if setting is modified:',
      error
    );
    return false;
  }
};

/**
 * Export settings for backup/export functionality
 */
export const exportSettings = () => {
  try {
    const settings = settingsService.getAllSettings();
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings,
    };

    logger.info(
      ENABLE_LOGGING,
      '[SettingsUtils] Exported settings:',
      exportData
    );

    return exportData;
  } catch (error) {
    logger.error(
      ENABLE_LOGGING,
      '[SettingsUtils] Error exporting settings:',
      error
    );
    throw error;
  }
};

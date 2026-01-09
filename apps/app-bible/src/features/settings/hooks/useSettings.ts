import { useCallback } from 'react';
import { useSettingsState, useSettingsActions } from '../store/settingsStore';
import { settingsService } from '../services/settingsService';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Hook for managing settings with service layer integration
 */
export const useSettings = () => {
  const state = useSettingsState();
  const actions = useSettingsActions();

  const updateMediaSettings = useCallback(
    async (settings: Parameters<typeof actions.updateMediaSettings>[0]) => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // Use service layer for business logic
        settingsService.updateMediaSettings(settings);

        logger.info(
          ENABLE_LOGGING,
          '[useSettings] Updated media settings:',
          settings
        );
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          '[useSettings] Failed to update media settings:',
          error
        );
        // Error handling would be done by the service layer
      } finally {
        actions.setLoading(false);
      }
    },
    [actions]
  );

  const resetToDefaults = useCallback(async () => {
    try {
      actions.setLoading(true);
      actions.clearError();

      settingsService.resetToDefaults();

      logger.info(ENABLE_LOGGING, '[useSettings] Reset settings to defaults');
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        '[useSettings] Failed to reset settings:',
        error
      );
    } finally {
      actions.setLoading(false);
    }
  }, [actions]);

  return {
    ...state,
    ...actions,
    updateMediaSettings,
    resetToDefaults,
  };
};

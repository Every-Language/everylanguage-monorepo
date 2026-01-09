import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/shared/utils/logger';
import type { SettingsStore, MediaSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Settings store for managing app-wide settings
 * Handles persistence and provides a centralized way to manage settings
 */
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      set => ({
        // Initial state
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        error: null,

        // Actions
        updateMediaSettings: (mediaSettings: Partial<MediaSettings>) => {
          set(
            state => ({
              settings: {
                ...state.settings,
                media: {
                  ...state.settings.media,
                  ...mediaSettings,
                },
              },
              error: null,
            }),
            false,
            'settings/updateMediaSettings'
          );

          logger.info(
            ENABLE_LOGGING,
            '[SettingsStore] Updated media settings:',
            mediaSettings
          );
        },

        resetToDefaults: () => {
          set(
            {
              settings: DEFAULT_SETTINGS,
              error: null,
            },
            false,
            'settings/resetToDefaults'
          );

          logger.info(
            ENABLE_LOGGING,
            '[SettingsStore] Reset settings to defaults'
          );
        },

        clearError: () => {
          set({ error: null }, false, 'settings/clearError');
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading }, false, 'settings/setLoading');
        },
      }),
      {
        name: 'app-settings-storage',
        storage: createJSONStorage(() => AsyncStorage),
        version: 1,
        partialize: state => ({
          settings: state.settings,
        }),
        migrate: (persistedState: unknown, version: number) => {
          if (version === 0) {
            logger.info(
              ENABLE_LOGGING,
              '[SettingsStore] Migrating settings from version 0 to 1'
            );
            // Handle any migration logic here if needed
          }
          return persistedState;
        },
      }
    ),
    {
      name: 'SettingsStore',
      enabled: __DEV__,
    }
  )
);

/**
 * Media settings store - specialized for media player settings
 * This maintains backward compatibility with the existing MediaSettingsStore
 */
export const useMediaSettingsStore = create<{
  autoOpenOnPlay: boolean;
  expandOnNextExternalPlay: boolean;
  setAutoOpenOnPlay: (value: boolean) => void;
  requestExpandOnNextExternalPlay: () => void;
  consumeExpandOnNextExternalPlay: () => void;
}>()(
  devtools(
    persist(
      set => ({
        // Initial state
        autoOpenOnPlay: true,
        expandOnNextExternalPlay: false,

        // Actions
        setAutoOpenOnPlay: (value: boolean) => {
          set(
            { autoOpenOnPlay: value },
            false,
            'mediaSettings/setAutoOpenOnPlay'
          );

          // Also update the main settings store
          useSettingsStore
            .getState()
            .updateMediaSettings({ autoOpenOnPlay: value });
        },

        requestExpandOnNextExternalPlay: () => {
          set(
            { expandOnNextExternalPlay: true },
            false,
            'mediaSettings/requestExpand'
          );
        },

        consumeExpandOnNextExternalPlay: () => {
          set(
            { expandOnNextExternalPlay: false },
            false,
            'mediaSettings/consumeExpand'
          );
        },
      }),
      {
        name: 'media-settings-storage',
        storage: createJSONStorage(() => AsyncStorage),
        version: 1,
        partialize: state => ({
          autoOpenOnPlay: state.autoOpenOnPlay,
        }),
      }
    ),
    {
      name: 'MediaSettingsStore',
      enabled: __DEV__,
    }
  )
);

// ==========================================
// Selective Hooks for Components
// ==========================================

/**
 * Hook to get media settings
 */
export const useMediaSettings = () => {
  return useSettingsStore(state => state.settings.media);
};

/**
 * Hook to get auto-open setting specifically
 */
export const useAutoOpenOnPlay = () => {
  return useSettingsStore(state => state.settings.media.autoOpenOnPlay);
};

/**
 * Hook to get settings actions
 */
export const useSettingsActions = () => {
  return useSettingsStore(state => ({
    updateMediaSettings: state.updateMediaSettings,
    resetToDefaults: state.resetToDefaults,
    clearError: state.clearError,
    setLoading: state.setLoading,
  }));
};

/**
 * Hook to get settings state
 */
export const useSettingsState = () => {
  return useSettingsStore(state => ({
    settings: state.settings,
    isLoading: state.isLoading,
    error: state.error,
  }));
};

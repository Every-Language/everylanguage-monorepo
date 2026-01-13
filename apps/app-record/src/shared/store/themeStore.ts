import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import type { Theme, ThemeMode } from '../types/theme';
import { themes } from '../constants/theme';

// Types
export interface ThemeState {
  mode: ThemeMode;
  isLoading: boolean;
  error: string | null;
  systemScheme: 'light' | 'dark';
}

export interface ThemeActions {
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  getTheme: () => Theme;
}

export type ThemeStore = ThemeState & ThemeActions;

// Theme storage key
const THEME_STORAGE_KEY = '@app_record_theme_mode';

// Store
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'light',
      isLoading: true,
      error: null,
      systemScheme: Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',

      // Actions
      setTheme: (mode: ThemeMode) => {
        set({ mode, error: null });
        // Save to AsyncStorage
        AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(error => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.error('Error saving theme preference:', error);
          }
          set({ error: 'Failed to save theme preference' });
        });
      },

      toggleTheme: () => {
        const { mode } = get();
        const newMode = mode === 'light' ? 'dark' : 'light';
        get().setTheme(newMode);
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearError: () => {
        set({ error: null });
      },

      getTheme: () => {
        try {
          const { mode, systemScheme } = get();
          const effectiveMode = mode === 'system' ? systemScheme : mode;
          return themes[effectiveMode] || themes.light;
        } catch {
          return themes.light;
        }
      },
    }),
    {
      name: 'app-record-theme-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the mode, not loading/error states
      partialize: state => ({ mode: state.mode }),
    }
  )
);

// Initialize theme from system preference
export const initializeThemeStore = async (): Promise<void> => {
  const store = useThemeStore.getState();

  try {
    store.setLoading(true);

    // Try to load saved theme preference
    const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);

    if (
      savedTheme &&
      (savedTheme === 'light' ||
        savedTheme === 'dark' ||
        savedTheme === 'system')
    ) {
      store.setTheme(savedTheme as ThemeMode);
    }

    // Subscribe to system theme changes to update systemScheme and trigger re-render
    const listener = ({
      colorScheme,
    }: {
      colorScheme: 'light' | 'dark' | null | undefined;
    }) => {
      const next = colorScheme === 'dark' ? 'dark' : 'light';
      useThemeStore.setState({ systemScheme: next });
    };
    Appearance.addChangeListener(listener);
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('Error loading theme preference:', error);
    }
    store.setTheme('light'); // Fallback to light theme
  } finally {
    store.setLoading(false);
  }
};

// Global declaration for React Native __DEV__ variable
declare const __DEV__: boolean;

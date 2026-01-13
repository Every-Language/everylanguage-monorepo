import { useThemeStore } from '../store/themeStore';
import type { Theme } from '../types/theme';
import { lightTheme } from '../constants/theme';

/**
 * Hook that provides theme functionality
 * Uses Zustand store for theme management
 */
export const useTheme = () => {
  const store = useThemeStore();
  const { getTheme, mode, toggleTheme, setTheme, isLoading, error } = store;

  // Get theme, fallback to light theme if store not ready
  let theme: Theme;
  try {
    theme = getTheme();
  } catch {
    theme = lightTheme;
  }

  return {
    theme,
    mode,
    toggleTheme,
    setTheme,
    isLoading,
    error,
  };
};

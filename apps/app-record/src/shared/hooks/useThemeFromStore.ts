import { useThemeStore } from '../store/themeStore';
import type { Theme } from '../types/theme';

/**
 * Hook that provides the same API as the old useTheme hook
 * but uses the new Zustand store instead of React Context
 */
export const useTheme = () => {
  const { getTheme, mode, toggleTheme, setTheme, isLoading, error } =
    useThemeStore();

  const theme: Theme = getTheme();

  return {
    theme,
    mode,
    toggleTheme,
    setTheme,
    isLoading,
    error,
  };
};

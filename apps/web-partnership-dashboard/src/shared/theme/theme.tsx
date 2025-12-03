import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Initialize theme synchronously to prevent flash
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const savedTheme = localStorage.getItem('omt-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // localStorage might not be available
  }

  return 'system';
}

function getInitialResolvedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const theme = getInitialTheme();

  if (theme === 'system') {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }

  return theme;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    getInitialResolvedTheme
  );

  // Check system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  };

  // Apply theme to document
  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    setResolvedTheme(newTheme);
  };

  // Sync with the theme that was applied by the blocking script
  // This ensures React state matches what's already on the DOM
  useEffect(() => {
    const currentClass = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    if (currentClass !== resolvedTheme) {
      setResolvedTheme(currentClass);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update resolved theme when theme changes
  useEffect(() => {
    let newResolvedTheme: 'light' | 'dark';

    if (theme === 'system') {
      newResolvedTheme = getSystemTheme();
    } else {
      newResolvedTheme = theme;
    }

    applyTheme(newResolvedTheme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        applyTheme(newSystemTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('omt-theme', newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme: handleSetTheme, resolvedTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

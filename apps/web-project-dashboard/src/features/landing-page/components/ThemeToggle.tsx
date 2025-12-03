import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../shared/theme';
import { Button } from '../../../shared/design-system/components/Button';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // If currently on system, switch to opposite of resolved theme
    // Otherwise, toggle between light and dark
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={toggleTheme}
      className='h-9 w-9 p-0 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg'
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className='h-5 w-5' />
      ) : (
        <Moon className='h-5 w-5' />
      )}
    </Button>
  );
};

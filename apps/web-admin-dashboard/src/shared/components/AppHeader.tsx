import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useTheme } from '../theme';
import { LogOut, Moon, Sun, Monitor, ChevronDown } from 'lucide-react';

const ThemeButton: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleThemeToggle = () => {
    setTheme(
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    );
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className='h-4 w-4' />;
    if (resolvedTheme === 'dark') return <Moon className='h-4 w-4' />;
    return <Sun className='h-4 w-4' />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  return (
    <div className='relative group'>
      <button
        onClick={handleThemeToggle}
        className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm text-neutral-700 dark:text-neutral-300'
        title={`Theme: ${theme}`}
      >
        {getThemeIcon()}
        <span className='hidden sm:inline'>{getThemeLabel()}</span>
      </button>
    </div>
  );
};

const AuthMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = user.email || 'User';
  const initial = user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className='relative'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className='flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
      >
        <div className='h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center'>
          <span className='text-white text-sm font-medium'>{initial}</span>
        </div>
        <span className='hidden sm:block text-sm text-neutral-700 dark:text-neutral-300 max-w-[150px] truncate'>
          {displayName}
        </span>
        <ChevronDown className='h-4 w-4 text-neutral-500' />
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-50'>
          <div className='px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800'>
            <div className='font-medium text-neutral-900 dark:text-neutral-100 truncate'>
              {displayName}
            </div>
            <div className='text-xs text-neutral-500'>System Admin</div>
          </div>
          <button
            onClick={handleSignOut}
            className='w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors'
          >
            <LogOut className='h-4 w-4' />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const AppHeader: React.FC = () => {
  return (
    <header className='sticky top-0 z-30 h-14 px-4 lg:px-6 bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3'>
      {/* Left: Brand */}
      <div className='flex items-baseline gap-2'>
        <div className='font-semibold select-none text-base text-neutral-900 dark:text-neutral-100'>
          Every Language
        </div>
        <span className='text-sm text-accent-600 dark:text-accent-500'>
          Admin
        </span>
      </div>

      {/* Spacer */}
      <div className='flex-1' />

      {/* Right: Theme + Auth */}
      <div className='flex items-center gap-2'>
        <ThemeButton />
        <AuthMenu />
      </div>
    </header>
  );
};

export default AppHeader;

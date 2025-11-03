import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSearch } from '@/features/search/hooks/useSearch';
import type { SearchResult } from '@/features/search/types';
import { Button } from './ui/Button';

type ViewMode = 'default' | 'search' | 'menu';

/**
 * Mobile App Header with three modes:
 * - default: brand, search icon, menu button
 * - search: full-width search bar
 * - menu: full-screen menu overlay
 */
export const MobileAppHeader: React.FC = () => {
  const [mode, setMode] = React.useState<ViewMode>('default');
  const [searchQuery, setSearchQuery] = React.useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSearch(searchQuery);

  const isMapRoute = location.pathname.startsWith('/map');
  const isDashboardRoute =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/partner-org') ||
    location.pathname.startsWith('/project') ||
    location.pathname.startsWith('/team') ||
    location.pathname.startsWith('/base');

  // Auto-focus search input when entering search mode
  React.useEffect(() => {
    if (mode === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mode]);

  // Close search/menu on route change
  React.useEffect(() => {
    setMode('default');
    setSearchQuery('');
  }, [location.pathname]);

  const handleSearchSelect = (item: SearchResult) => {
    const path =
      item.kind === 'language'
        ? `/map/language/${encodeURIComponent(item.id)}`
        : `/map/region/${encodeURIComponent(item.id)}`;
    navigate(path);
    setMode('default');
    setSearchQuery('');
  };

  const handleMenuNavigate = (path: string) => {
    navigate(path);
    setMode('default');
  };

  // Default mode
  if (mode === 'default') {
    return (
      <header className='sticky top-0 z-30 h-14 px-4 bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
        <div className='font-semibold text-base'>Every Language</div>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setMode('search')}
            aria-label='Search'
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800'
          >
            <Search className='h-5 w-5' />
          </button>
          <MenuButton isOpen={false} onClick={() => setMode('menu')} />
        </div>
      </header>
    );
  }

  // Search mode
  if (mode === 'search') {
    const showResults = searchQuery.trim().length >= 2;

    return (
      <>
        <header className='sticky top-0 z-30 h-14 px-4 bg-white/70 dark:bg-neutral-900/70 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3'>
          <button
            onClick={() => {
              setMode('default');
              setSearchQuery('');
            }}
            aria-label='Back'
            className='p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800'
          >
            ←
          </button>
          <div className='flex-1 relative'>
            <input
              ref={searchInputRef}
              type='text'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search languages or regions'
              className='w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600'
            />
          </div>
        </header>

        {/* Search results dropdown */}
        {showResults && (
          <div className='fixed top-14 left-0 right-0 z-20 max-h-[60vh] overflow-auto bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-lg'>
            {isLoading && (
              <div className='px-4 py-3 text-sm text-neutral-500'>
                Searching…
              </div>
            )}
            {!isLoading && results.length > 0 && (
              <>
                {results.map((r, idx) => (
                  <button
                    key={`${r.kind}-${r.id}-${idx}`}
                    onClick={() => handleSearchSelect(r)}
                    className='w-full text-left px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0'
                  >
                    <div className='font-medium text-sm'>{r.name}</div>
                    <div className='text-xs text-neutral-500 mt-0.5'>
                      {r.kind === 'language' ? 'Language' : 'Region'}
                      {r.level ? ` · ${r.level}` : ''}
                      {r.alias ? ` · matched: ${r.alias}` : ''}
                    </div>
                  </button>
                ))}
              </>
            )}
            {!isLoading && results.length === 0 && (
              <div className='px-4 py-3 text-sm text-neutral-500'>
                No matches
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  // Menu mode
  return (
    <>
      <header className='sticky top-0 z-50 h-14 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between'>
        <div className='font-semibold text-base'>Every Language</div>
        <MenuButton isOpen={true} onClick={() => setMode('default')} />
      </header>

      {/* Full-screen menu overlay */}
      <div
        className='fixed inset-0 z-40 bg-white dark:bg-neutral-900 flex items-center justify-start px-8 animate-in fade-in slide-in-from-top-4 duration-300'
        style={{ top: '56px' }}
      >
        <nav className='w-full max-w-md space-y-6'>
          <div className='text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-8'>
            Every Language
          </div>

          <button
            onClick={() => handleMenuNavigate('/map')}
            className={`block w-full text-left text-xl py-3 px-4 rounded-lg transition-colors ${
              isMapRoute
                ? 'text-accent-600 bg-accent-50 dark:bg-accent-950 font-semibold'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Map
          </button>

          <button
            onClick={() => handleMenuNavigate('/dashboard')}
            className={`block w-full text-left text-xl py-3 px-4 rounded-lg transition-colors ${
              isDashboardRoute
                ? 'text-accent-600 bg-accent-50 dark:bg-accent-950 font-semibold'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Dashboard
          </button>

          <div className='pt-4'>
            <Button
              variant='primary'
              size='lg'
              onClick={() => handleMenuNavigate('/donate')}
              className='w-full'
            >
              Donate
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
};

/**
 * Animated menu button that transitions between hamburger (two bars) and X
 */
const MenuButton: React.FC<{ isOpen: boolean; onClick: () => void }> = ({
  isOpen,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 relative w-10 h-10 flex items-center justify-center'
    >
      <div className='w-5 h-4 flex flex-col justify-center gap-1.5'>
        <span
          className={`block h-0.5 w-full bg-current transition-all duration-300 origin-center ${
            isOpen ? 'rotate-45 translate-y-1' : ''
          }`}
        />
        <span
          className={`block h-0.5 w-full bg-current transition-all duration-300 origin-center ${
            isOpen ? '-rotate-45 -translate-y-1' : ''
          }`}
        />
      </div>
    </button>
  );
};

export default MobileAppHeader;

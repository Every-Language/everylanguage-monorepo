import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useTheme } from '../../theme';
import {
  Menu,
  X,
  Database,
  Map,
  DollarSign,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Menu className='h-5 w-5' />,
  },
  {
    id: 'languages',
    label: 'Languages',
    path: '/languages',
    section: 'Data',
    icon: <Database className='h-5 w-5' />,
  },
  {
    id: 'regions',
    label: 'Regions',
    path: '/regions',
    section: 'Data',
    icon: <Map className='h-5 w-5' />,
  },
  {
    id: 'sponsorships',
    label: 'Sponsorships',
    path: '/sponsorships',
    section: 'Funding',
    icon: <DollarSign className='h-5 w-5' />,
  },
  {
    id: 'allocations',
    label: 'Allocate Sponsorships',
    path: '/sponsorships/allocate',
    section: 'Funding',
    icon: <DollarSign className='h-5 w-5' />,
  },
];

export function AppLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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

  // Group navigation items by section
  const groupedItems = navigationItems.reduce(
    (acc, item) => {
      const section = item.section || 'Main';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  return (
    <div className='flex h-screen bg-neutral-50'>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Header */}
        <div className='h-16 flex items-center justify-between px-4 border-b border-neutral-200'>
          {sidebarOpen && (
            <div>
              <h1 className='text-lg font-bold text-neutral-900'>
                Every Language Admin Dashboard
              </h1>
              <p className='text-xs text-neutral-500'>System Administration</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
          >
            {sidebarOpen ? (
              <X className='h-5 w-5' />
            ) : (
              <Menu className='h-5 w-5' />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 overflow-y-auto py-4'>
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className='mb-6'>
              {sidebarOpen && section !== 'Main' && (
                <div className='px-4 mb-2'>
                  <p className='text-xs font-semibold text-neutral-500 uppercase tracking-wider'>
                    {section}
                  </p>
                </div>
              )}
              {items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center ${
                      sidebarOpen ? 'px-4' : 'px-6'
                    } py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span
                      className={
                        isActive ? 'text-primary-700' : 'text-neutral-500'
                      }
                    >
                      {item.icon}
                    </span>
                    {sidebarOpen && (
                      <span className='ml-3 text-sm font-medium'>
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className='border-t border-neutral-200 p-4'>
          {sidebarOpen ? (
            <div className='space-y-2'>
              <div className='flex items-center space-x-3 mb-3'>
                <div className='h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center'>
                  <span className='text-white text-sm font-medium'>
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-neutral-900 truncate'>
                    {user?.email}
                  </p>
                  <p className='text-xs text-neutral-500'>System Admin</p>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <button
                  onClick={handleThemeToggle}
                  className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
                  title={`Theme: ${theme}`}
                >
                  {getThemeIcon()}
                </button>
                <button
                  onClick={handleSignOut}
                  className='flex items-center space-x-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-700'
                >
                  <LogOut className='h-4 w-4' />
                  <span className='text-sm'>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center space-y-3'>
              <div className='h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center'>
                <span className='text-white text-sm font-medium'>
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleThemeToggle}
                className='p-2 rounded-lg hover:bg-neutral-100 transition-colors'
                title={`Theme: ${theme}`}
              >
                {getThemeIcon()}
              </button>
              <button
                onClick={handleSignOut}
                className='p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-700'
                title='Sign Out'
              >
                <LogOut className='h-4 w-4' />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className='flex-1 overflow-y-auto'>
        <div className='h-full'>{children}</div>
      </main>
    </div>
  );
}

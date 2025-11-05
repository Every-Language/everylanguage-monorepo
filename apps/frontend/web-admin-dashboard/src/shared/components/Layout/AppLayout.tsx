import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Database,
  Map,
  DollarSign,
  LayoutDashboard,
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
    icon: <LayoutDashboard className='h-5 w-5' />,
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
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className='flex flex-1 overflow-hidden bg-neutral-50 dark:bg-neutral-950'>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-[width] duration-300 ease-in-out flex flex-col will-change-[width] overflow-hidden`}
      >
        {/* Header */}
        <div className='h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
          <div
            className={`overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
          >
            <h1 className='text-base font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap'>
              Admin Dashboard
            </h1>
            <p className='text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap'>
              System Administration
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300'
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <X className='h-5 w-5' />
            ) : (
              <Menu className='h-5 w-5' />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 overflow-hidden py-4'>
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className='mb-6'>
              {sidebarOpen && section !== 'Main' && (
                <div className='px-4 mb-2'>
                  <p className='text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
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
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-700 dark:border-primary-500'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span
                      className={
                        isActive
                          ? 'text-primary-700 dark:text-primary-400'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className='flex-1 overflow-y-auto'>{children}</main>
    </div>
  );
}

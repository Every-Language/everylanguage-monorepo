import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Database,
  Map,
  LayoutDashboard,
  HandCoins,
  Globe,
  FolderKanban,
  Settings,
  BookOpen,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  MapPin,
  Headphones,
  FileText,
  Shield,
  Repeat,
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
  children?: NavItem[];
  parentId?: string;
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
    id: 'bible-translation-overrides',
    label: 'Bible Translation Overrides',
    path: '/statistics/bible-translations',
    section: 'Data',
    icon: <BookOpen className='h-5 w-5' />,
  },
  {
    id: 'external-projects-overrides',
    label: 'External Projects Overrides',
    path: '/statistics/external-projects',
    section: 'Data',
    icon: <FolderOpen className='h-5 w-5' />,
  },
  {
    id: 'language-availability',
    label: 'Language Availability',
    path: '/budgets/languages',
    section: 'Budgets',
    icon: <Globe className='h-5 w-5' />,
  },
  {
    id: 'operations',
    label: 'Operations',
    path: '/budgets/operations',
    section: 'Budgets',
    icon: <Settings className='h-5 w-5' />,
  },
  {
    id: 'donations',
    label: 'Donations',
    path: '/donations',
    section: 'Budgets',
    icon: <HandCoins className='h-5 w-5' />,
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    path: '/budgets/subscriptions',
    section: 'Budgets',
    icon: <Repeat className='h-5 w-5' />,
  },
  {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    section: 'Projects',
    icon: <FolderKanban className='h-5 w-5' />,
  },
  {
    id: 'audio-versions',
    label: 'Audio Versions',
    path: '/projects/audio-versions',
    section: 'Projects',
    icon: <Headphones className='h-5 w-5' />,
  },
  {
    id: 'text-versions',
    label: 'Text Versions',
    path: '/projects/text-versions',
    section: 'Projects',
    icon: <FileText className='h-5 w-5' />,
  },
  {
    id: 'project-updates',
    label: 'Project Updates',
    path: '/projects/updates',
    section: 'Projects',
    icon: <FileText className='h-5 w-5' />,
  },
  {
    id: 'users',
    label: 'Users',
    path: '/users',
    section: 'USERS',
    icon: <Users className='h-5 w-5' />,
  },
  {
    id: 'partner-orgs',
    label: 'Partner Orgs',
    path: '/users/partner-orgs',
    section: 'USERS',
    icon: <Building2 className='h-5 w-5' />,
  },
  {
    id: 'bases',
    label: 'Bases',
    path: '/users/bases',
    section: 'USERS',
    icon: <MapPin className='h-5 w-5' />,
  },
  {
    id: 'permissions',
    label: 'Permissions',
    path: '/permissions',
    section: 'USERS',
    icon: <Shield className='h-5 w-5' />,
  },
];

export function AppLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-expand parent items when child route is active
  useEffect(() => {
    const newExpanded = new Set<string>();
    navigationItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          child => location.pathname === child.path
        );
        if (hasActiveChild) {
          newExpanded.add(item.id);
        }
      }
    });
    if (newExpanded.size > 0) {
      setExpandedItems(newExpanded);
    }
  }, [location.pathname]);

  // Separate items without sections (like Dashboard) from items with sections
  const itemsWithoutSection = navigationItems.filter(item => !item.section);
  const itemsWithSection = navigationItems.filter(item => item.section);

  // Group items with sections by section name
  const groupedItems = itemsWithSection.reduce(
    (acc, item) => {
      const section = item.section!;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  return (
    <div className='flex flex-1 overflow-hidden bg-neutral-50 dark:bg-neutral-950'>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-[width] duration-300 ease-in-out flex flex-col will-change-[width] overflow-hidden`}>
        {/* Header */}
        <div className='h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0'>
          <div
            className={`overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
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
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
            {sidebarOpen ? (
              <X className='h-5 w-5' />
            ) : (
              <Menu className='h-5 w-5' />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 overflow-y-auto py-4'>
          {/* Render items without sections first (like Dashboard) */}
          {itemsWithoutSection.length > 0 && (
            <div className='mb-6'>
              {itemsWithoutSection.map(item => {
                const isActive = location.pathname === item.path;
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems.has(item.id);
                const hasActiveChild =
                  hasChildren &&
                  item.children?.some(
                    child => location.pathname === child.path
                  );

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleExpand(item.id);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={`w-full flex items-center ${
                        sidebarOpen ? 'px-4' : 'px-6'
                      } py-3 text-left transition-colors ${
                        isActive || hasActiveChild
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-700 dark:border-primary-500'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      title={!sidebarOpen ? item.label : undefined}>
                      {hasChildren && sidebarOpen && (
                        <span className='mr-1'>
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </span>
                      )}
                      <span
                        className={
                          isActive || hasActiveChild
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }>
                        {item.icon}
                      </span>
                      <span
                        className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                        {item.label}
                      </span>
                    </button>
                    {/* Render children if expanded */}
                    {hasChildren && isExpanded && sidebarOpen && (
                      <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2'>
                        {item.children?.map(child => {
                          const isChildActive =
                            location.pathname === child.path;
                          return (
                            <button
                              key={child.id}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center px-4 py-2 text-left transition-colors ${
                                isChildActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}>
                              <span
                                className={
                                  isChildActive
                                    ? 'text-primary-700 dark:text-primary-400'
                                    : 'text-neutral-500 dark:text-neutral-400'
                                }>
                                {child.icon}
                              </span>
                              <span className='ml-3 text-sm font-medium whitespace-nowrap'>
                                {child.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Render items with sections */}
          {Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className='mb-6'>
              {sidebarOpen && (
                <div className='px-4 mb-2'>
                  <p className='text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'>
                    {section}
                  </p>
                </div>
              )}
              {items.map(item => {
                const isActive = location.pathname === item.path;
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems.has(item.id);
                const hasActiveChild =
                  hasChildren &&
                  item.children?.some(
                    child => location.pathname === child.path
                  );

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        if (hasChildren) {
                          toggleExpand(item.id);
                        } else {
                          navigate(item.path);
                        }
                      }}
                      className={`w-full flex items-center ${
                        sidebarOpen ? 'px-4' : 'px-6'
                      } py-3 text-left transition-colors ${
                        isActive || hasActiveChild
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-r-2 border-primary-700 dark:border-primary-500'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      title={!sidebarOpen ? item.label : undefined}>
                      {hasChildren && sidebarOpen && (
                        <span className='mr-1'>
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </span>
                      )}
                      <span
                        className={
                          isActive || hasActiveChild
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }>
                        {item.icon}
                      </span>
                      <span
                        className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                        {item.label}
                      </span>
                    </button>
                    {/* Render children if expanded */}
                    {hasChildren && isExpanded && sidebarOpen && (
                      <div className='ml-4 border-l border-neutral-200 dark:border-neutral-800 pl-2'>
                        {item.children?.map(child => {
                          const isChildActive =
                            location.pathname === child.path;
                          return (
                            <button
                              key={child.id}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center px-4 py-2 text-left transition-colors ${
                                isChildActive
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                              }`}>
                              <span
                                className={
                                  isChildActive
                                    ? 'text-primary-700 dark:text-primary-400'
                                    : 'text-neutral-500 dark:text-neutral-400'
                                }>
                                {child.icon}
                              </span>
                              <span className='ml-3 text-sm font-medium whitespace-nowrap'>
                                {child.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

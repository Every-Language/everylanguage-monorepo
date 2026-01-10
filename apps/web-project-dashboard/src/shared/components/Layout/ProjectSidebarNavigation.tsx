import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SidebarNav, SidebarNavItem } from '../../design-system';

interface NavigationItem {
  id: string;
  label: string;
  pathSuffix: string;
  icon: React.ReactNode;
  description?: string;
  isExternalRoute?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    pathSuffix: '/dashboard',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
        />
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z'
        />
      </svg>
    ),
    description: 'Project overview and recent activity',
  },
  {
    id: 'progress',
    label: 'Bible Progress',
    pathSuffix: '/progress',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
        />
      </svg>
    ),
    description: 'View Bible book and chapter progress',
  },
  {
    id: 'audio-versions',
    label: 'Audio Management',
    pathSuffix: '/audio-versions',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'
        />
      </svg>
    ),
    description: 'Manage audio versions and files',
  },
  {
    id: 'community-check',
    label: 'Community Check',
    pathSuffix: '/community-check',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
        />
      </svg>
    ),
    description: 'Review and approve content',
  },
  {
    id: 'updates',
    label: 'Project Updates',
    pathSuffix: '/updates',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
        />
      </svg>
    ),
    description: 'Share progress and updates',
  },
  {
    id: 'text-versions',
    label: 'Text Versions',
    pathSuffix: '/text-versions',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        />
      </svg>
    ),
    description: 'Manage Bible text versions',
  },
  {
    id: 'language-search',
    label: 'Language Search',
    pathSuffix: '/languages',
    isExternalRoute: true,
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
        />
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945'
        />
      </svg>
    ),
    description: 'Search languages and translation progress',
  },
  {
    id: 'members',
    label: 'Members',
    pathSuffix: '/members',
    icon: (
      <svg
        className='h-4 w-4'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
        />
      </svg>
    ),
    description: 'Manage project members and permissions',
  },
];

export const ProjectSidebarNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const handleNavigate = (item: NavigationItem) => {
    if (item.isExternalRoute) {
      // Navigate to external route (outside project context)
      navigate(item.pathSuffix);
    } else if (projectId) {
      navigate(`/project/${projectId}${item.pathSuffix}`);
    }
  };

  // Check if current path matches a nav item (accounting for nested routes)
  const isActive = (item: NavigationItem) => {
    if (item.isExternalRoute) {
      return location.pathname === item.pathSuffix;
    }
    const basePath = `/project/${projectId}${item.pathSuffix}`;
    return (
      location.pathname === basePath ||
      location.pathname.startsWith(basePath + '/')
    );
  };

  return (
    <SidebarNav>
      {navigationItems.map(item => (
        <SidebarNavItem
          key={item.id}
          icon={item.icon}
          active={isActive(item)}
          onClick={() => handleNavigate(item)}>
          {item.label}
        </SidebarNavItem>
      ))}
    </SidebarNav>
  );
};

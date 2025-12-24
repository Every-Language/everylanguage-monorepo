'use client';

import React from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from './ui/Dropdown';
import { useUserPartnerOrgs } from '@/features/dashboard/hooks/useUserPartnerOrgs';
import { usePartnerOrgProjects } from '@/features/partnerorgs/api/usePartnerOrgProjects';
import { useAuth } from '@/features/auth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

interface SearchableDropdownProps {
  items: Array<{
    id: string;
    label: string;
    href: string;
    isSelected?: boolean;
  }>;
  isLoading: boolean;
  onSelect: (href: string) => void;
}

const SearchableDropdownContent: React.FC<SearchableDropdownProps> = ({
  items,
  isLoading,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => item.label.toLowerCase().includes(query));
  }, [items, searchQuery]);

  return (
    <div className='min-w-[200px] bg-white dark:bg-neutral-900'>
      {/* Search input */}
      <div
        className='px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700'
        onClick={e => e.stopPropagation()}>
        <input
          type='text'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder='Search...'
          className='w-full px-2 py-1 text-sm rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-accent-600'
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        />
      </div>

      {/* Items list */}
      <div
        className='max-h-[250px] overflow-y-auto'
        onClick={e => e.stopPropagation()}>
        {isLoading ? (
          <div className='px-2 py-1.5 text-sm text-neutral-500'>Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className='px-2 py-1.5 text-sm text-neutral-500'>
            {searchQuery ? 'No matches' : 'No items found'}
          </div>
        ) : (
          filteredItems.map(item => (
            <DropdownItem
              key={item.id}
              onClick={() => onSelect(item.href)}
              className='cursor-pointer'
              selected={item.isSelected}>
              {item.label}
            </DropdownItem>
          ))
        )}
      </div>
    </div>
  );
};

export const DashboardBreadcrumbs: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const { user } = useAuth();

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/partner-org') ||
    pathname.startsWith('/project') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/base');

  // Extract orgId and projectId from pathname, handling both old and new routes
  const orgIdMatch =
    pathname.match(/\/dashboard\/partner-org\/([^/]+)/) ||
    pathname.match(/\/partner-org\/([^/]+)/);
  const projectIdMatch =
    pathname.match(/\/dashboard\/partner-org\/[^/]+\/project\/([^/]+)/) ||
    pathname.match(/\/partner-org\/[^/]+\/project\/([^/]+)/) ||
    pathname.match(/\/project\/([^/]+)/);
  const effectiveOrgId = params.orgId || orgIdMatch?.[1];
  const effectiveProjectId = params.projectId || projectIdMatch?.[1];

  // Fetch partner org name
  const partnerOrgQuery = useQuery({
    queryKey: ['partner-org', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id, name')
        .eq('id', effectiveOrgId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    enabled: !!effectiveOrgId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch project name
  const projectQuery = useQuery({
    queryKey: ['project', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return null;
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('id, name')
        .eq('id', effectiveProjectId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    enabled: !!effectiveProjectId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user's partner orgs for dropdown
  const { partnerOrgs, isLoading: partnerOrgsLoading } = useUserPartnerOrgs(
    user?.id ?? null
  );

  // Fetch partner org's projects for dropdown
  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    effectiveOrgId ?? ''
  );

  const partnerOrgName = partnerOrgQuery.data?.name || 'Loading...';
  const projectName = projectQuery.data?.name || 'Loading...';
  const isGlobalStatsRoute = pathname.startsWith(
    '/dashboard/global-statistics'
  );

  const handlePartnerOrgClick = () => {
    if (isGlobalStatsRoute) {
      router.push('/dashboard/global-statistics');
    } else if (effectiveOrgId) {
      router.push(
        `/dashboard/partner-org/${encodeURIComponent(effectiveOrgId)}`
      );
    }
  };

  const handleProjectClick = () => {
    if (effectiveOrgId && effectiveProjectId) {
      router.push(
        `/dashboard/partner-org/${encodeURIComponent(effectiveOrgId)}/project/${encodeURIComponent(effectiveProjectId)}`
      );
    }
  };

  // Get unique projects for dropdown
  const uniqueProjects = React.useMemo(() => {
    if (!projects) return [];
    const seen = new Map<string, (typeof projects)[0]>();
    for (const project of projects) {
      if (!seen.has(project.project_id)) {
        seen.set(project.project_id, project);
      }
    }
    return Array.from(seen.values());
  }, [projects]);

  const isOnMapRoute = pathname.startsWith('/map');

  return (
    <div className='flex items-center gap-2 min-w-0'>
      {/* Every Language - static */}
      <div className='font-semibold select-none text-base flex-shrink-0'>
        Every Language
      </div>

      {/* Dashboard - clickable with separate dropdown (same structure as map route) */}
      <div className='font-semibold flex items-center gap-1 flex-shrink-0'>
        <button
          onClick={() => router.push('/dashboard')}
          className='text-primary-600 text-base hover:text-primary-700 dark:text-primary-600 dark:hover:text-primary-300 transition-colors'>
          Dashboard
        </button>
        <Dropdown>
          <DropdownTrigger
            variant='ghost'
            className='px-1 py-1 border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0'
            showChevron={false}>
            <ChevronDown className='h-5 w-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' />
          </DropdownTrigger>
          <DropdownContent className='bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg'>
            <DropdownItem
              onClick={() => router.push('/map')}
              selected={isOnMapRoute}>
              Map
            </DropdownItem>
            <DropdownItem
              onClick={() => router.push('/dashboard')}
              selected={
                !isOnMapRoute &&
                isDashboardRoute &&
                !isGlobalStatsRoute &&
                !effectiveOrgId
              }>
              Dashboard
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>

      {/* Partner Org / Global Stats section */}
      {(effectiveOrgId || isGlobalStatsRoute) && (
        <>
          <span className='text-neutral-400 flex-shrink-0'>/</span>
          <div className='flex items-center gap-1 min-w-0'>
            {isGlobalStatsRoute ? (
              <button
                onClick={() => router.push('/dashboard/global-statistics')}
                className='text-base font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'>
                Global Translation Statistics
              </button>
            ) : (
              <button
                onClick={handlePartnerOrgClick}
                className='text-base font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
                disabled={partnerOrgQuery.isLoading}
                title={partnerOrgQuery.isLoading ? undefined : partnerOrgName}>
                {partnerOrgQuery.isLoading ? 'Loading...' : partnerOrgName}
              </button>
            )}
            <Dropdown>
              <DropdownTrigger
                variant='ghost'
                className='px-1 py-1 border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 flex-shrink-0'
                showChevron={false}>
                <ChevronDown className='h-5 w-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' />
              </DropdownTrigger>
              <DropdownContent className='bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg p-0'>
                <SearchableDropdownContent
                  items={[
                    {
                      id: 'global-stats',
                      label: 'Global Translation Statistics',
                      href: '/dashboard/global-statistics',
                      isSelected: isGlobalStatsRoute,
                    },
                    ...partnerOrgs.map(org => ({
                      id: org.id,
                      label: org.name,
                      href: `/dashboard/partner-org/${encodeURIComponent(org.id)}`,
                      isSelected: org.id === effectiveOrgId,
                    })),
                  ]}
                  isLoading={partnerOrgsLoading}
                  onSelect={href => router.push(href)}
                />
              </DropdownContent>
            </Dropdown>
          </div>
        </>
      )}

      {/* Project section */}
      {effectiveProjectId && effectiveOrgId && (
        <>
          <span className='text-neutral-400 flex-shrink-0'>/</span>
          <div className='flex items-center gap-1 min-w-0'>
            <button
              onClick={handleProjectClick}
              className='text-base font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
              disabled={projectQuery.isLoading}
              title={projectQuery.isLoading ? undefined : projectName}>
              {projectQuery.isLoading ? 'Loading...' : projectName}
            </button>
            <Dropdown>
              <DropdownTrigger
                variant='ghost'
                className='px-1 py-1 border-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 flex-shrink-0'
                showChevron={false}>
                <ChevronDown className='h-5 w-5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' />
              </DropdownTrigger>
              <DropdownContent className='bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-lg p-0'>
                <SearchableDropdownContent
                  items={uniqueProjects.map(p => ({
                    id: p.project_id,
                    label: p.language_name || p.project_name,
                    href: `/dashboard/partner-org/${encodeURIComponent(effectiveOrgId!)}/project/${encodeURIComponent(p.project_id)}`,
                    isSelected: p.project_id === effectiveProjectId,
                  }))}
                  isLoading={projectsLoading}
                  onSelect={href => router.push(href)}
                />
              </DropdownContent>
            </Dropdown>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardBreadcrumbs;

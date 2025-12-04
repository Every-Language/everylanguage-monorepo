'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface BreadcrumbItem {
  label: string;
  href: string;
  type: 'dashboard' | 'partner-org' | 'project';
}

interface BreadcrumbNavigationProps {
  className?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  className,
}) => {
  const router = useRouter();
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const { user } = useAuth();

  // Parse pathname to determine breadcrumb structure
  const breadcrumbs = React.useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      {
        label: 'Every Language',
        href: '/dashboard',
        type: 'dashboard',
      },
    ];

    if (params.orgId) {
      items.push({
        label: '', // Will be filled by query
        href: `/partner-org/${encodeURIComponent(params.orgId)}`,
        type: 'partner-org',
      });
    }

    if (params.projectId && params.orgId) {
      items.push({
        label: '', // Will be filled by query
        href: `/partner-org/${encodeURIComponent(params.orgId)}/project/${encodeURIComponent(params.projectId)}`,
        type: 'project',
      });
    }

    return items;
  }, [params.orgId, params.projectId]);

  // Fetch partner org name
  const partnerOrgQuery = useQuery({
    queryKey: ['partner-org', params.orgId],
    queryFn: async () => {
      if (!params.orgId) return null;
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id, name')
        .eq('id', params.orgId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string } | null;
    },
    enabled: !!params.orgId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch project name
  const projectQuery = useQuery({
    queryKey: ['project', params.projectId],
    queryFn: async () => {
      if (!params.projectId) return null;
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('id, name, target_language_entity_id')
        .eq('id', params.projectId)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        target_language_entity_id: string;
      } | null;
    },
    enabled: !!params.projectId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user's partner orgs for dashboard dropdown
  const { partnerOrgs, isLoading: partnerOrgsLoading } = useUserPartnerOrgs(
    user?.id ?? null
  );

  // Fetch partner org's projects for org dropdown
  const { data: projects, isLoading: projectsLoading } = usePartnerOrgProjects(
    params.orgId ?? ''
  );

  // Update breadcrumb labels
  const breadcrumbsWithLabels = React.useMemo(() => {
    return breadcrumbs.map(item => {
      if (item.type === 'partner-org' && partnerOrgQuery.data) {
        return { ...item, label: partnerOrgQuery.data.name };
      }
      if (item.type === 'project' && projectQuery.data) {
        return { ...item, label: projectQuery.data.name };
      }
      return item;
    });
  }, [breadcrumbs, partnerOrgQuery.data, projectQuery.data]);

  const handleBreadcrumbClick = (href: string) => {
    router.push(href);
  };

  return (
    <nav className={`flex items-center gap-1 ${className ?? ''}`}>
      {breadcrumbsWithLabels.map((crumb, index) => {
        const isLast = index === breadcrumbsWithLabels.length - 1;
        const isLoading =
          (crumb.type === 'partner-org' && partnerOrgQuery.isLoading) ||
          (crumb.type === 'project' && projectQuery.isLoading);

        return (
          <React.Fragment key={index}>
            <div className='flex items-center gap-1'>
              {/* Clickable breadcrumb item */}
              <button
                onClick={() => handleBreadcrumbClick(crumb.href)}
                className='text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors'
                disabled={isLoading}>
                {isLoading ? '...' : crumb.label || 'Loading...'}
              </button>

              {/* Dropdown trigger */}
              {!isLast && (
                <Dropdown>
                  <DropdownTrigger
                    variant='ghost'
                    size='sm'
                    className='px-1 py-0 h-auto border-0 hover:bg-transparent focus:ring-0'
                    showChevron={false}>
                    <ChevronDown className='h-4 w-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300' />
                  </DropdownTrigger>
                  <DropdownContent
                    align='start'
                    className='max-h-[300px] overflow-y-auto'>
                    {crumb.type === 'dashboard' && (
                      <BreadcrumbDropdownContent
                        items={partnerOrgs.map(org => ({
                          id: org.id,
                          label: org.name,
                          href: `/partner-org/${encodeURIComponent(org.id)}`,
                        }))}
                        isLoading={partnerOrgsLoading}
                        onSelect={href => router.push(href)}
                      />
                    )}
                    {crumb.type === 'partner-org' && (
                      <BreadcrumbDropdownContent
                        items={
                          projects
                            ?.filter(
                              (
                                p: { project_id: string },
                                idx: number,
                                arr: Array<{ project_id: string }>
                              ) =>
                                arr.findIndex(
                                  (x: { project_id: string }) =>
                                    x.project_id === p.project_id
                                ) === idx
                            )
                            .map(
                              (p: {
                                project_id: string;
                                language_name?: string | null;
                                project_name: string;
                              }) => ({
                                id: p.project_id,
                                label: p.language_name || p.project_name,
                                href: `/partner-org/${encodeURIComponent(params.orgId!)}/project/${encodeURIComponent(p.project_id)}`,
                              })
                            ) ?? []
                        }
                        isLoading={projectsLoading}
                        onSelect={href => router.push(href)}
                      />
                    )}
                    {crumb.type === 'project' && (
                      <BreadcrumbDropdownContent
                        items={
                          projects
                            ?.filter(
                              (
                                p: { project_id: string },
                                idx: number,
                                arr: Array<{ project_id: string }>
                              ) =>
                                arr.findIndex(
                                  (x: { project_id: string }) =>
                                    x.project_id === p.project_id
                                ) === idx
                            )
                            .map(
                              (p: {
                                project_id: string;
                                language_name?: string | null;
                                project_name: string;
                              }) => ({
                                id: p.project_id,
                                label: p.language_name || p.project_name,
                                href: `/partner-org/${encodeURIComponent(params.orgId!)}/project/${encodeURIComponent(p.project_id)}`,
                              })
                            ) ?? []
                        }
                        isLoading={projectsLoading}
                        onSelect={href => router.push(href)}
                      />
                    )}
                  </DropdownContent>
                </Dropdown>
              )}

              {/* Separator */}
              {!isLast && <span className='mx-1 text-neutral-400'>/</span>}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

interface BreadcrumbDropdownContentProps {
  items: Array<{ id: string; label: string; href: string }>;
  isLoading: boolean;
  onSelect: (href: string) => void;
}

const BreadcrumbDropdownContent: React.FC<BreadcrumbDropdownContentProps> = ({
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

  if (isLoading) {
    return (
      <div className='px-2 py-1.5 text-sm text-neutral-500'>Loading...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='px-2 py-1.5 text-sm text-neutral-500'>No items found</div>
    );
  }

  return (
    <div className='min-w-[200px]'>
      {/* Search input */}
      <div className='px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700'>
        <input
          type='text'
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder='Search...'
          className='w-full px-2 py-1 text-sm rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-accent-600'
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Items list */}
      <div
        className='max-h-[250px] overflow-y-auto'
        onClick={e => e.stopPropagation()}>
        {filteredItems.length === 0 ? (
          <div className='px-2 py-1.5 text-sm text-neutral-500'>No matches</div>
        ) : (
          filteredItems.map(item => (
            <DropdownItem
              key={item.id}
              onClick={() => onSelect(item.href)}
              className='cursor-pointer'>
              {item.label}
            </DropdownItem>
          ))
        )}
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;

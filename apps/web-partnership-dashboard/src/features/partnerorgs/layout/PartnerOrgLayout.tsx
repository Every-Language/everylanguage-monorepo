'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { ProjectSelector } from '../components/ProjectSelector';

interface PartnerOrgLayoutProps {
  children: React.ReactNode;
}

export const PartnerOrgLayout: React.FC<PartnerOrgLayoutProps> = ({
  children,
}) => {
  const { orgId, projectId } = useParams<{
    orgId: string;
    projectId?: string;
  }>();
  const pathname = usePathname();
  const partner = useQuery({
    queryKey: ['partner-org', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id,name,description')
        .eq('id', orgId as string)
        .single();
      if (error) throw error;
      return data as {
        id?: string | null;
        name?: string | null;
        description?: string | null;
      };
    },
    enabled: !!orgId,
  });

  const currentPath = pathname;
  const isPendingLanguages = currentPath.includes('/pending-languages');
  const isDashboard = currentPath.includes('/dashboard');
  const isProjectView = projectId && projectId !== 'all';

  // Determine available tabs based on current view
  const tabs: Array<{ to: string; label: string }> = React.useMemo(() => {
    if (isPendingLanguages) {
      return [
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/pending-languages`,
          label: 'Pending Languages',
        },
      ];
    } else if (isDashboard || !projectId) {
      return [
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/dashboard`,
          label: 'Dashboard',
        },
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/pending-languages`,
          label: 'Pending Languages',
        },
      ];
    } else {
      // Project view
      return [
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/project/${encodeURIComponent(projectId)}/progress`,
          label: 'Translation Progress',
        },
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/project/${encodeURIComponent(projectId)}/distribution`,
          label: 'Distribution',
        },
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/project/${encodeURIComponent(projectId)}/funding`,
          label: 'Funding',
        },
        {
          to: `/partner-org/${encodeURIComponent(orgId ?? '')}/project/${encodeURIComponent(projectId)}/updates`,
          label: 'Updates',
        },
      ];
    }
  }, [orgId, projectId, isPendingLanguages, isDashboard]);

  const activeTabLabel = React.useMemo(() => {
    const current = tabs.find(t => pathname.startsWith(t.to));
    return current?.label;
  }, [pathname, tabs]);

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        {/* Breadcrumbs */}
        <div className='flex items-center justify-between'>
          <div>
            <div className='text-xs text-neutral-500'>
              <Link href='/dashboard' className='hover:underline'>
                Dashboard
              </Link>{' '}
              / {partner.data?.name ?? '—'}
              {activeTabLabel && activeTabLabel !== 'Dashboard' ? (
                <> / {activeTabLabel}</>
              ) : null}
            </div>
            <h1 className='text-2xl font-bold'>
              {partner.data?.name ?? 'Partner Organization'}
            </h1>
          </div>
        </div>

        {/* Project Selector (only show in project views, not in dashboard or pending languages) */}
        {isProjectView && !isPendingLanguages && (
          <div className='flex items-center'>
            <ProjectSelector />
          </div>
        )}

        {/* Tabs */}
        <div className='border-b border-neutral-200 dark:border-neutral-800'>
          <nav className='-mb-px flex gap-4 overflow-x-auto'>
            {tabs.map(t => {
              const isActive =
                pathname === t.to || pathname.startsWith(t.to + '/');
              return (
                <Link
                  key={t.to}
                  href={t.to}
                  className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 ${isActive ? 'border-accent-600 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Routed content */}
        {children}
      </div>
    </div>
  );
};

export default PartnerOrgLayout;

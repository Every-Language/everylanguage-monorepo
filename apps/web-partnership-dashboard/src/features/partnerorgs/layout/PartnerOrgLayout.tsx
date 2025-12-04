'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

interface PartnerOrgLayoutProps {
  children: React.ReactNode;
}

export const PartnerOrgLayout: React.FC<PartnerOrgLayoutProps> = ({
  children,
}) => {
  const { orgId } = useParams<{
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
    staleTime: 10 * 60 * 1000, // 10 minutes - partner org name doesn't change often
    placeholderData: keepPreviousData,
  });

  // Define tabs for partner org pages
  const tabs: Array<{ to: string; label: string }> = React.useMemo(() => {
    const basePath = `/dashboard/partner-org/${encodeURIComponent(orgId ?? '')}`;
    return [
      {
        to: basePath,
        label: 'Overview',
      },
      {
        to: `${basePath}/projects`,
        label: 'Projects',
      },
      {
        to: `${basePath}/distribution`,
        label: 'Distribution',
      },
      {
        to: `${basePath}/donations`,
        label: 'Donations',
      },
      {
        to: `${basePath}/updates`,
        label: 'Updates',
      },
      {
        to: `${basePath}/members`,
        label: 'Members',
      },
    ];
  }, [orgId]);

  // If we're on a project route, don't render the partner org layout - just pass through
  if (pathname?.includes('/project/')) {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        {/* Title */}
        <div>
          <h1 className='text-2xl font-bold'>
            {(partner.data as any)?.name ?? 'Partner Organization'}
          </h1>
        </div>

        {/* Tabs */}
        <div className='border-b border-neutral-200 dark:border-neutral-800'>
          <nav className='-mb-px flex gap-4 overflow-x-auto'>
            {tabs.map(t => {
              // For overview tab, require exact match
              // For other tabs, check if pathname starts with the tab path
              const isActive =
                t.to ===
                `/dashboard/partner-org/${encodeURIComponent(orgId ?? '')}`
                  ? pathname === t.to
                  : pathname.startsWith(t.to + '/') || pathname === t.to;
              return (
                <Link
                  key={t.to}
                  href={t.to}
                  className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 ${isActive ? 'border-accent-600 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
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

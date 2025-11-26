'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { useAuth } from '@/features/auth';

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
  const queryClient = useQueryClient();
  const { user } = useAuth();
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

  // Prefetch handlers for each tab
  const prefetchTabData = React.useCallback(
    (tabLabel: string) => {
      if (!orgId) return;

      switch (tabLabel) {
        case 'Overview':
          // Prefetch projects, progress, and distribution for overview
          queryClient.prefetchQuery({
            queryKey: ['partner-org-projects', orgId],
            queryFn: async () => {
              const { data, error } = await (supabase as any)
                .from('partner_org_projects_via_donations')
                .select('*')
                .eq('partner_org_id', orgId)
                .order('language_name');
              if (error) throw error;
              return data ?? [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ['project-progress', 'all', orgId],
            queryFn: async () => {
              // Simplified prefetch - just trigger the query
              // The actual query logic is in useProjectProgress hook
              return null;
            },
          });
          queryClient.prefetchQuery({
            queryKey: ['project-distribution', 'all', orgId],
            queryFn: async () => {
              // Simplified prefetch - just trigger the query
              return null;
            },
          });
          break;
        case 'Progress':
          queryClient.prefetchQuery({
            queryKey: ['partner-org-projects', orgId],
            queryFn: async () => {
              const { data, error } = await (supabase as any)
                .from('partner_org_projects_via_donations')
                .select('*')
                .eq('partner_org_id', orgId)
                .order('language_name');
              if (error) throw error;
              return data ?? [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ['project-progress', 'all', orgId],
            queryFn: async () => null,
          });
          break;
        case 'Distribution':
          queryClient.prefetchQuery({
            queryKey: ['partner-org-projects', orgId],
            queryFn: async () => {
              const { data, error } = await (supabase as any)
                .from('partner_org_projects_via_donations')
                .select('*')
                .eq('partner_org_id', orgId)
                .order('language_name');
              if (error) throw error;
              return data ?? [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ['project-distribution', 'all', orgId],
            queryFn: async () => null,
          });
          break;
        case 'Donations':
          queryClient.prefetchQuery({
            queryKey: ['partner-org-donations', orgId, user?.id ?? null],
            queryFn: async () => {
              const { data: donations, error } = await (supabase as any)
                .from('donations')
                .select(
                  `
                  *,
                  donation_allocations (
                    id,
                    amount_cents,
                    currency_code,
                    project_id,
                    operation_id,
                    effective_from,
                    effective_to,
                    notes,
                    project:projects!donation_allocations_project_id_fkey (
                      id,
                      name,
                      target_language_entity_id,
                      language_entity:language_entities!projects_target_language_entity_id_fkey (
                        id,
                        name
                      )
                    ),
                    operation:operations!donation_allocations_operation_id_fkey (
                      id,
                      name,
                      category
                    )
                  ),
                  intent_language:language_entities!donations_intent_language_entity_id_fkey (
                    id,
                    name
                  ),
                  intent_region:regions!donations_intent_region_id_fkey (
                    id,
                    name
                  ),
                  intent_operation:operations!donations_intent_operation_id_fkey (
                    id,
                    name
                  )
                `
                )
                .eq('partner_org_id', orgId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

              if (error) throw error;

              return (donations ?? []).map((d: any) => ({
                ...d,
                donation_allocations: Array.isArray(d.donation_allocations)
                  ? d.donation_allocations
                  : [],
                intent_language: Array.isArray(d.intent_language)
                  ? d.intent_language[0]
                  : d.intent_language,
                intent_region: Array.isArray(d.intent_region)
                  ? d.intent_region[0]
                  : d.intent_region,
                intent_operation: Array.isArray(d.intent_operation)
                  ? d.intent_operation[0]
                  : d.intent_operation,
                isFromCurrentUser: user?.id !== null && d.user_id === user?.id,
              }));
            },
          });
          break;
        case 'Updates':
          queryClient.prefetchQuery({
            queryKey: ['partner-org-updates', orgId],
            queryFn: async () => {
              // Simplified - actual query logic is in usePartnerOrgUpdates
              return null;
            },
          });
          break;
        case 'Members':
          queryClient.prefetchQuery({
            queryKey: ['partner-org-members', orgId],
            queryFn: async () => {
              const { data, error } = await (supabase as any).rpc(
                'get_partner_org_members',
                {
                  p_partner_org_id: orgId,
                }
              );
              if (error) throw error;
              return data ?? [];
            },
          });
          break;
      }
    },
    [orgId, queryClient, user?.id]
  );

  // Define tabs for partner org pages
  const tabs: Array<{ to: string; label: string }> = React.useMemo(() => {
    const basePath = `/partner-org/${encodeURIComponent(orgId ?? '')}`;
    return [
      {
        to: basePath,
        label: 'Overview',
      },
      {
        to: `${basePath}/progress`,
        label: 'Progress',
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

  const activeTabLabel = React.useMemo(() => {
    const current = tabs.find(t => {
      if (t.to === `/partner-org/${encodeURIComponent(orgId ?? '')}`) {
        // Exact match for overview - must be exactly the base path
        return pathname === t.to;
      }
      // For other tabs, check if pathname starts with the tab path
      return pathname.startsWith(t.to + '/') || pathname === t.to;
    });
    return current?.label;
  }, [pathname, tabs, orgId]);

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-950'>
      <div className='mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6'>
        {/* Breadcrumbs and Back Button */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Link
              href='/dashboard'
              className='p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors'
              aria-label='Back'
            >
              ←
            </Link>
            <div>
              <div className='text-xs text-neutral-500'>
                <Link href='/dashboard' className='hover:underline'>
                  Dashboard
                </Link>{' '}
                / {(partner.data as any)?.name ?? '—'}
                {activeTabLabel && activeTabLabel !== 'Overview' ? (
                  <> / {activeTabLabel}</>
                ) : null}
              </div>
              <h1 className='text-2xl font-bold'>
                {(partner.data as any)?.name ?? 'Partner Organization'}
              </h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className='border-b border-neutral-200 dark:border-neutral-800'>
          <nav className='-mb-px flex gap-4 overflow-x-auto'>
            {tabs.map(t => {
              // For overview tab, require exact match
              // For other tabs, check if pathname starts with the tab path
              const isActive =
                t.to === `/partner-org/${encodeURIComponent(orgId ?? '')}`
                  ? pathname === t.to
                  : pathname.startsWith(t.to + '/') || pathname === t.to;
              return (
                <Link
                  key={t.to}
                  href={t.to}
                  onMouseEnter={() => prefetchTabData(t.label)}
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

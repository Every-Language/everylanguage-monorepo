import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface PartnerOrgOption {
  id: string;
  name: string;
  description: string | null;
  isPersonal: boolean;
}

export function useUserPartnerOrgs(userId: string | null) {
  // Query partner orgs from user_roles
  const rolesQuery = useQuery({
    enabled: !!userId,
    queryKey: ['user-partner-org-roles', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('context_id, context_type')
        .eq('user_id', userId as string)
        .in('context_type', ['partner', 'partner_org', 'partner_orgs']);
      if (error) throw error;
      return (data ?? []) as Array<{
        context_id?: string | null;
        context_type?: string | null;
      }>;
    },
  });

  // Get partner org IDs from roles
  const partnerOrgIds =
    rolesQuery.data
      ?.map(r => r.context_id)
      .filter((id): id is string => !!id) ?? [];

  // Query partner orgs from user_roles
  const partnerOrgsQuery = useQuery({
    enabled: partnerOrgIds.length > 0,
    queryKey: ['user-partner-orgs', partnerOrgIds.sort().join(',')],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id, name, description')
        .in('id', partnerOrgIds);
      if (error) throw error;
      return (data ?? []).map((org: any) => ({
        id: String(org.id),
        name: String(org.name ?? ''),
        description: org.description ?? null,
        isPersonal: false,
      })) as PartnerOrgOption[];
    },
  });

  // Query personal partner org (is_individual=true, created_by=user.id)
  const personalOrgQuery = useQuery({
    enabled: !!userId,
    queryKey: ['user-personal-partner-org', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_orgs')
        .select('id, name, description')
        .eq('is_individual', true)
        .eq('created_by', userId as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: String(data.id),
        name: String(data.name ?? ''),
        description: data.description ?? null,
        isPersonal: true,
      } as PartnerOrgOption;
    },
  });

  // Combine results
  const allPartnerOrgs = React.useMemo(() => {
    const orgs: PartnerOrgOption[] = [];
    const seenIds = new Set<string>();

    // Add personal org first if it exists
    if (personalOrgQuery.data) {
      orgs.push(personalOrgQuery.data);
      seenIds.add(personalOrgQuery.data.id);
    }

    // Add partner orgs from roles (avoid duplicates)
    if (partnerOrgsQuery.data) {
      for (const org of partnerOrgsQuery.data) {
        if (!seenIds.has(org.id)) {
          orgs.push(org);
          seenIds.add(org.id);
        }
      }
    }

    return orgs;
  }, [personalOrgQuery.data, partnerOrgsQuery.data]);

  const isLoading =
    rolesQuery.isLoading ||
    partnerOrgsQuery.isLoading ||
    personalOrgQuery.isLoading;

  return {
    partnerOrgs: allPartnerOrgs,
    isLoading,
  };
}

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface PartnerOrgOption {
  id: string;
  name: string;
  description: string | null;
  isPersonal: boolean;
  role_id?: string;
  role_key?: string | null;
  role_name?: string | null;
}

export function useUserPartnerOrgs(userId: string | null) {
  // Query partner orgs using user_partner_orgs view (includes role information)
  const partnerOrgsQuery = useQuery({
    enabled: !!userId,
    queryKey: ['user-partner-orgs', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_partner_orgs')
        .select('id, name, description, role_id, role_key, role_name');
      if (error) throw error;
      return (data ?? []).map((org: any) => ({
        id: String(org.id),
        name: String(org.name ?? ''),
        description: org.description ?? null,
        isPersonal: false,
        role_id: String(org.role_id),
        role_key: org.role_key ?? null,
        role_name: org.role_name ?? null,
      })) as PartnerOrgOption[];
    },
  });

  // Query personal partner org (is_individual=true, created_by=user.id)
  // This is separate because personal orgs are based on ownership, not roles
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

    // Add partner orgs from view (avoid duplicates)
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

  const isLoading = partnerOrgsQuery.isLoading || personalOrgQuery.isLoading;

  return {
    partnerOrgs: allPartnerOrgs,
    isLoading,
  };
}

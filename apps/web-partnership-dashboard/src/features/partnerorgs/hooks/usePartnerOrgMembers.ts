import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface PartnerOrgMember {
  user_id: string;
  role_id: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    full_name: string | null;
  } | null;
  role: {
    id: string;
    name: string;
    role_key: string;
    resource_type: string;
  } | null;
}

export function usePartnerOrgMembers(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-members', partnerOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        'get_partner_org_members',
        {
          p_partner_org_id: partnerOrgId,
        }
      );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        user_id: row.user_id,
        role_id: row.role_id,
        user: {
          id: row.user_id,
          first_name: row.user_first_name,
          last_name: row.user_last_name,
          email: row.user_email,
          full_name: row.user_full_name,
        },
        role: row.role_id
          ? {
              id: row.role_id,
              name: row.role_name,
              role_key: row.role_key,
              resource_type: row.role_resource_type,
            }
          : null,
      })) as PartnerOrgMember[];
    },
    enabled: !!partnerOrgId,
  });
}

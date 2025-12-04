import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { PartnerOrgMember } from '../types';

export function usePartnerOrgMembers(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-members', partnerOrgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(
          `
          user_id,
          role_id,
          user:users!user_roles_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          role:roles!user_roles_role_id_fkey (
            id,
            name,
            role_key,
            resource_type
          )
        `
        )
        .eq('partner_org_id', partnerOrgId)
        .not('partner_org_id', 'is', null);

      if (error) throw error;

      return (data ?? []).map((row: any) => {
        const user = row.user;
        const role = row.role;
        const userFullName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
          : null;

        return {
          user_id: row.user_id,
          role_id: row.role_id,
          user: user
            ? {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                full_name: userFullName,
              }
            : null,
          role: role
            ? {
                id: role.id,
                name: role.name,
                role_key: role.role_key,
                resource_type: role.resource_type,
              }
            : null,
        };
      }) as PartnerOrgMember[];
    },
    enabled: !!partnerOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes - membership changes are infrequent
  });
}

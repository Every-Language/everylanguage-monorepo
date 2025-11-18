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
      const { data: userRoles, error } = await (supabase as any)
        .from('user_roles')
        .select(
          `
          user_id,
          role_id,
          user:users!user_roles_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            full_name
          ),
          role:roles!user_roles_role_id_fkey (
            id,
            name,
            role_key,
            resource_type
          )
        `
        )
        .eq('context_type', 'partner')
        .eq('context_id', partnerOrgId);

      if (error) throw error;

      return (userRoles ?? []).map((ur: any) => ({
        user_id: ur.user_id,
        role_id: ur.role_id,
        user: Array.isArray(ur.user) ? ur.user[0] : ur.user,
        role: Array.isArray(ur.role) ? ur.role[0] : ur.role,
      })) as PartnerOrgMember[];
    },
    enabled: !!partnerOrgId,
  });
}

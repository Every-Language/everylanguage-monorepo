import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function usePartnerOrgProjects(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-active-projects', partnerOrgId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vw_partner_org_active_projects')
        .select('*')
        .eq('partner_org_id', partnerOrgId)
        .order('language_name');

      if (error) throw error;
      return data;
    },
    enabled: !!partnerOrgId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface PartnerOrgProject {
  partner_org_id: string;
  project_id: string;
  project_name: string;
  project_description: string | null;
  language_entity_id: string;
  language_name: string;
  allocation_id: string;
  allocation_amount_cents: number;
  allocation_currency_code: string;
  effective_from: string;
  effective_to: string | null;
  donation_id: string;
  donation_status: string;
  intent_type: string;
  intent_language_entity_id: string | null;
  intent_region_id: string | null;
  intent_operation_id: string | null;
}

export function usePartnerOrgProjects(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-projects', partnerOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('partner_org_projects_via_donations')
        .select('*')
        .eq('partner_org_id', partnerOrgId)
        .order('language_name');

      if (error) throw error;
      return (data ?? []) as PartnerOrgProject[];
    },
    enabled: !!partnerOrgId,
  });
}

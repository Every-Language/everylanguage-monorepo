import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export interface DonationAllocation {
  id: string;
  amount_cents: number;
  currency_code: string;
  project_id: string | null;
  operation_id: string | null;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  project?: {
    id: string;
    name: string;
    target_language_entity_id: string;
    language_entity?: {
      id: string;
      name: string;
    };
  } | null;
  operation?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

export interface PartnerOrgDonation {
  id: string;
  amount_cents: number;
  currency_code: string;
  status: string;
  intent_type: string;
  intent_language_entity_id: string | null;
  intent_region_id: string | null;
  intent_operation_id: string | null;
  payment_method: string;
  is_recurring: boolean;
  created_at: string;
  completed_at: string | null;
  user_id: string | null;
  partner_org_id: string | null;
  intent_language?: {
    id: string;
    name: string;
  } | null;
  intent_region?: {
    id: string;
    name: string;
  } | null;
  intent_operation?: {
    id: string;
    name: string;
  } | null;
  donation_allocations: DonationAllocation[];
  isFromCurrentUser: boolean;
}

export function usePartnerOrgDonations(
  partnerOrgId: string,
  currentUserId: string | null
) {
  return useQuery({
    queryKey: ['partner-org-donations', partnerOrgId],
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
        .eq('partner_org_id', partnerOrgId)
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
        isFromCurrentUser:
          currentUserId !== null && d.user_id === currentUserId,
      })) as PartnerOrgDonation[];
    },
    enabled: !!partnerOrgId,
  });
}

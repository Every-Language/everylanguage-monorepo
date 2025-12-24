import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { normalizeSupabaseRelation } from '@/shared/utils/supabase-helpers';
import type { PartnerOrgDonation } from '../types';

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
          ),
          subscription:subscriptions!donations_subscription_id_fkey (
            id,
            status,
            stripe_subscription_id
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
          ? d.donation_allocations.map((alloc: any) => ({
              ...alloc,
              project: normalizeSupabaseRelation(alloc.project),
              operation: normalizeSupabaseRelation(alloc.operation),
            }))
          : [],
        intent_language: normalizeSupabaseRelation(d.intent_language),
        intent_region: normalizeSupabaseRelation(d.intent_region),
        intent_operation: normalizeSupabaseRelation(d.intent_operation),
        subscription: normalizeSupabaseRelation(d.subscription),
        isFromCurrentUser:
          currentUserId !== null && d.user_id === currentUserId,
      })) as PartnerOrgDonation[];
    },
    enabled: !!partnerOrgId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function usePartnerOrgTotalDonations(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-total-donations', partnerOrgId],
    queryFn: async () => {
      if (!partnerOrgId) {
        return { total_cents: 0, currency_code: 'USD' };
      }

      // Sum all donations for this partner org
      const { data, error } = await (supabase as any)
        .from('donations')
        .select('amount_cents, currency_code')
        .eq('partner_org_id', partnerOrgId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching donations:', error);
        return { total_cents: 0, currency_code: 'USD' };
      }

      if (!data || data.length === 0) {
        return { total_cents: 0, currency_code: 'USD' };
      }

      // Sum amounts (assuming all are same currency for simplicity)
      // In production, you might want to handle multiple currencies
      const totalCents = data.reduce(
        (sum: number, d: any) => sum + (d.amount_cents || 0),
        0
      );

      return {
        total_cents: totalCents,
        currency_code: data[0]?.currency_code || 'USD',
      };
    },
    enabled: !!partnerOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

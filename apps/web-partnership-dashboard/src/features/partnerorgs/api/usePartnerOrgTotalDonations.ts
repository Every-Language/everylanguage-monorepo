import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { formatCurrency } from '@/shared/utils/formatters';

export interface PartnerOrgTotalDonations {
  total_cents: number;
  currency_code: string;
  formattedTotal: string;
}

export function usePartnerOrgTotalDonations(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-total-donations', partnerOrgId],
    queryFn: async () => {
      if (!partnerOrgId) {
        return {
          total_cents: 0,
          currency_code: 'USD',
          formattedTotal: formatCurrency(0, 'USD'),
        };
      }

      const { data, error } = await (supabase as any)
        .from('donations')
        .select('amount_cents, currency_code')
        .eq('partner_org_id', partnerOrgId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching donations:', error);
        return {
          total_cents: 0,
          currency_code: 'USD',
          formattedTotal: formatCurrency(0, 'USD'),
        };
      }

      if (!data || data.length === 0) {
        return {
          total_cents: 0,
          currency_code: 'USD',
          formattedTotal: formatCurrency(0, 'USD'),
        };
      }

      const totalCents = data.reduce(
        (sum: number, d: any) => sum + (d.amount_cents || 0),
        0
      );
      const currencyCode = data[0]?.currency_code || 'USD';

      return {
        total_cents: totalCents,
        currency_code: currencyCode,
        formattedTotal: formatCurrency(totalCents, currencyCode),
      } as PartnerOrgTotalDonations;
    },
    enabled: !!partnerOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

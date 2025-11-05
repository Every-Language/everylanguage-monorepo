import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function usePendingLanguages(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-pending-languages', partnerOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vw_partner_org_pending_languages')
        .select('*')
        .eq('partner_org_id', partnerOrgId)
        .order('language_name');

      if (error) throw error;

      // For each pending language, get contributions and language stats
      const enrichedData = await Promise.all(
        data.map(async (lang: any) => {
          // Get contributions for this sponsorship
          const { data: contributions } = await (supabase as any)
            .from('contributions')
            .select('amount_cents, currency_code, occurred_at, kind')
            .eq('sponsorship_id', (lang as any).sponsorship_id);

          const totalContributed =
            contributions?.reduce(
              (sum: any, c: any) => sum + c.amount_cents,
              0
            ) || 0;

          // Get language-level stats (downloads, listening time)
          const { data: stats } = await supabase
            .from('mv_language_listens_stats')
            .select('downloads, total_listened_seconds')
            .eq('language_entity_id', (lang as any).language_entity_id)
            .maybeSingle();

          return {
            ...lang,
            total_contributed_cents: totalContributed,
            contributions: contributions || [],
            language_stats: stats || {
              downloads: 0,
              total_listened_seconds: 0,
            },
          };
        })
      );

      return enrichedData;
    },
    enabled: !!partnerOrgId,
  });
}

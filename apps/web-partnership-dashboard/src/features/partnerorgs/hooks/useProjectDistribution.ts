import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function useProjectDistribution(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-distribution', projectId, partnerOrgId],
    queryFn: async () => {
      const langQuery =
        projectId === 'all'
          ? (supabase as any)
              .from('vw_partner_org_language_entities_via_donations')
              .select('language_entity_id')
              .eq('partner_org_id', partnerOrgId!)
          : supabase
              .from('audio_versions')
              .select('language_entity_id')
              .eq('project_id', projectId);

      const { data: langData } = await langQuery;
      const languageIds = langData?.map((l: any) => l.language_entity_id) || [];

      // Handle empty languageIds array to avoid 400 error
      if (languageIds.length === 0) {
        return {
          heatmap: [],
          totalDownloads: 0,
          totalListeningHours: 0,
        };
      }

      // Get heatmap data and stats in parallel
      const [heatmapResult, statsResult] = await Promise.all([
        supabase
          .from('vw_language_listens_heatmap')
          .select('*')
          .in('language_entity_id', languageIds),
        supabase
          .from('mv_language_listens_stats')
          .select('language_entity_id, downloads, total_listened_seconds')
          .in('language_entity_id', languageIds),
      ]);

      const { data: heatmap, error: heatmapError } = heatmapResult;
      if (heatmapError) throw heatmapError;

      const { data: stats, error: statsError } = statsResult;
      if (statsError) throw statsError;

      const totalDownloads =
        (stats as any)?.reduce(
          (sum: number, d: any) => sum + (d.downloads || 0),
          0
        ) || 0;
      const totalListeningHours = Math.round(
        ((stats as any)?.reduce(
          (sum: number, l: any) => sum + (l.total_listened_seconds || 0),
          0
        ) || 0) / 3600
      );

      // Create per-language breakdown for 'all' mode
      const perLanguageStats = new Map<
        string,
        { downloads: number; listeningHours: number }
      >();
      if (stats && Array.isArray(stats)) {
        for (const stat of stats as Array<{
          language_entity_id?: string;
          downloads?: number;
          total_listened_seconds?: number;
        }>) {
          const langId = stat.language_entity_id;
          if (langId) {
            const existing = perLanguageStats.get(langId) || {
              downloads: 0,
              listeningHours: 0,
            };
            perLanguageStats.set(langId, {
              downloads: existing.downloads + (stat.downloads || 0),
              listeningHours:
                existing.listeningHours +
                Math.round((stat.total_listened_seconds || 0) / 3600),
            });
          }
        }
      }

      return {
        heatmap: heatmap || [],
        totalDownloads,
        totalListeningHours,
        perLanguageStats:
          projectId === 'all'
            ? Object.fromEntries(perLanguageStats)
            : undefined,
      };
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
    staleTime: 5 * 60 * 1000, // 5 minutes - distribution data doesn't change frequently
    placeholderData: keepPreviousData, // Keep previous data while fetching new data for smoother transitions
  });
}

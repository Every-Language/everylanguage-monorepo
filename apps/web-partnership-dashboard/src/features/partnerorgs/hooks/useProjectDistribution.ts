import { useQuery } from '@tanstack/react-query';
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
              .from('vw_partner_org_language_entities')
              .select('language_entity_id')
              .eq('partner_org_id', partnerOrgId!)
          : supabase
              .from('audio_versions')
              .select('language_entity_id')
              .eq('project_id', projectId);

      const { data: langData } = await langQuery;
      const languageIds = langData?.map((l: any) => l.language_entity_id) || [];

      // Get heatmap data
      const { data: heatmap } = await supabase
        .from('vw_language_listens_heatmap')
        .select('*')
        .in('language_entity_id', languageIds);

      // Get download counts from mv_language_listens_stats
      const { data: stats } = await supabase
        .from('mv_language_listens_stats')
        .select('downloads, total_listened_seconds')
        .in('language_entity_id', languageIds);

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

      return {
        heatmap: heatmap || [],
        totalDownloads,
        totalListeningHours,
      };
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}

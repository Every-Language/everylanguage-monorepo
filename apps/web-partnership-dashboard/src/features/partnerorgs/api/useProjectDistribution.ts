import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { DistributionHeatmapData } from '../types';

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
              .from('partner_orgs_projects')
              .select('language_entity_id')
              .eq('partner_org_id', partnerOrgId!)
          : supabase
              .from('audio_versions')
              .select('language_entity_id')
              .eq('project_id', projectId);

      const { data: langData } = await langQuery;
      const languageIds = [
        ...new Set(
          projectId === 'all'
            ? langData
                ?.map((l: any) => l.project?.target_language_entity_id)
                .filter(Boolean) || []
            : langData?.map((l: any) => l.language_entity_id).filter(Boolean) ||
                []
        ),
      ];

      if (languageIds.length === 0) {
        return {
          heatmap: [],
        } as DistributionHeatmapData;
      }

      const { data: heatmap, error: heatmapError } = await supabase
        .from('vw_language_listens_heatmap')
        .select('*')
        .in('language_entity_id', languageIds);

      if (heatmapError) throw heatmapError;

      return {
        heatmap: heatmap || [],
      } as DistributionHeatmapData;
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
    staleTime: 5 * 60 * 1000, // 5 minutes - distribution data doesn't change frequently
    placeholderData: keepPreviousData,
  });
}

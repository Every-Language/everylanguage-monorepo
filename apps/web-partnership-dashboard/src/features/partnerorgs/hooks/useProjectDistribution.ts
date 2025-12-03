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
              .from('partner_org_projects_via_donations')
              .select('language_entity_id')
              .eq('partner_org_id', partnerOrgId!)
          : supabase
              .from('audio_versions')
              .select('language_entity_id')
              .eq('project_id', projectId);

      const { data: langData } = await langQuery;
      // Deduplicate language_entity_id values since partner_org_projects_via_donations
      // can have multiple rows per language_entity_id (one per project/allocation)
      const languageIds = [
        ...new Set(
          langData?.map((l: any) => l.language_entity_id).filter(Boolean) || []
        ),
      ];

      // Handle empty languageIds array to avoid 400 error
      if (languageIds.length === 0) {
        return {
          heatmap: [],
        };
      }

      // Get heatmap data only
      const { data: heatmap, error: heatmapError } = await supabase
        .from('vw_language_listens_heatmap')
        .select('*')
        .in('language_entity_id', languageIds);

      if (heatmapError) throw heatmapError;

      return {
        heatmap: heatmap || [],
      };
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
    staleTime: 5 * 60 * 1000, // 5 minutes - distribution data doesn't change frequently
    placeholderData: keepPreviousData, // Keep previous data while fetching new data for smoother transitions
  });
}

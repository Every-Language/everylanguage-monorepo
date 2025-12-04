import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function usePartnerOrgListeningSessions(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-listening-sessions', partnerOrgId],
    queryFn: async () => {
      if (!partnerOrgId) {
        return 0;
      }

      // Fetch language entity IDs directly from partner_orgs_projects
      // This removes the sequential dependency on usePartnerOrgProjects
      const { data: projectsData, error: projectsError } = await (
        supabase as any
      )
        .from('partner_orgs_projects')
        .select('project:projects(target_language_entity_id)')
        .eq('partner_org_id', partnerOrgId)
        .is('unassigned_at', null);

      if (projectsError) {
        console.error('Error fetching partner org projects:', projectsError);
        return 0;
      }

      const languageEntityIds = Array.from(
        new Set(
          projectsData
            ?.map((p: any) => p.project?.target_language_entity_id)
            .filter(
              (id: any): id is string => !!id && typeof id === 'string'
            ) || []
        )
      );

      if (languageEntityIds.length === 0) {
        return 0;
      }

      // Query the materialized view for fast aggregated results
      const { data: stats, error: statsError } = await (supabase as any)
        .from('language_listening_sessions_stats')
        .select('distinct_sessions')
        .in('language_entity_id', languageEntityIds);

      if (statsError) {
        console.error('Error fetching listening sessions stats:', statsError);
        return 0;
      }

      // Sum up distinct sessions across all languages
      const totalSessions =
        stats?.reduce(
          (sum: number, row: any) => sum + (row.distinct_sessions || 0),
          0
        ) || 0;

      return totalSessions;
    },
    enabled: !!partnerOrgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

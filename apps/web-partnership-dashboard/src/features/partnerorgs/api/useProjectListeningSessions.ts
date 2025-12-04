import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function useProjectListeningSessions(projectId: string) {
  return useQuery({
    queryKey: ['project-listening-sessions', projectId],
    queryFn: async () => {
      if (!projectId) {
        return 0;
      }

      // Fetch project's language entity ID (fast - single row lookup by primary key)
      const { data: project, error: projectError } = await (supabase as any)
        .from('projects')
        .select('target_language_entity_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project?.target_language_entity_id) {
        console.error('Error fetching project:', projectError);
        return 0;
      }

      const languageEntityId = project.target_language_entity_id;

      // Query the materialized view for fast aggregated results
      const { data: stats, error: statsError } = await (supabase as any)
        .from('language_listening_sessions_stats')
        .select('distinct_sessions')
        .eq('language_entity_id', languageEntityId)
        .single();

      if (statsError) {
        console.error('Error fetching listening sessions stats:', statsError);
        return 0;
      }

      return stats?.distinct_sessions || 0;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function useProjectProgress(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-progress', projectId, partnerOrgId],
    queryFn: async () => {
      if (projectId === 'all') {
        // Aggregate all projects for this partner org
        // Get project IDs first, then query audio_versions by project_id (more reliable)
        const { data: projects } = await (supabase as any)
          .from('vw_partner_org_projects_via_donations')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!);

        const projectIds =
          projects
            ?.map((p: any) => p.project_id)
            .filter((id: any): id is string => !!id) || [];

        // Handle empty projectIds array to avoid 400 error
        if (projectIds.length === 0) {
          return [];
        }

        // Remove duplicates
        const uniqueProjectIds = Array.from(new Set(projectIds));

        const { data: audioVersions, error } = await supabase
          .from('audio_versions')
          .select(
            `
            id,
            name,
            language_entity_id,
            project_id,
            audio_version_progress_summary (*)
          `
          )
          .in('project_id', uniqueProjectIds)
          .is('deleted_at', null);

        if (error) throw error;
        return audioVersions || [];
      } else {
        // Single project
        const { data, error } = await supabase
          .from('audio_versions')
          .select(
            `
            id,
            name,
            language_entity_id,
            project_id,
            audio_version_progress_summary (*)
          `
          )
          .eq('project_id', projectId)
          .is('deleted_at', null);

        if (error) throw error;
        return data;
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}

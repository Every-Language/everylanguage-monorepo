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
        const { data: langEntities } = await (supabase as any)
          .from('vw_partner_org_language_entities')
          .select('language_entity_id, project_id')
          .eq('partner_org_id', partnerOrgId!);

        const languageIds =
          langEntities?.map((le: any) => le.language_entity_id) || [];
        const { data: audioVersions } = await supabase
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
          .in('language_entity_id', languageIds)
          .is('deleted_at', null);

        return audioVersions;
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

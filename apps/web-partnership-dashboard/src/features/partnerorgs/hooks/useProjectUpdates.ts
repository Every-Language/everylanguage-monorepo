import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

// Temporary types until database types are regenerated
interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  body: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  media?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useProjectUpdates(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-updates', projectId, partnerOrgId],
    queryFn: async () => {
      if (projectId === 'all') {
        // Get updates for all partner org projects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: projects } = await (supabase as any)
          .from('vw_partner_org_projects')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!);

        const projectIds =
          projects?.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => p.project_id
          ) || [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updates, error: updatesError } = await (supabase as any)
          .from('project_updates')
          .select(
            `
            *,
            project:projects (
              id,
              name,
              target_language_entity_id,
              language_entity:language_entities (
                id,
                name
              )
            ),
            media:project_updates_media (
              id,
              media_type,
              object_key,
              storage_provider,
              original_filename,
              file_type,
              caption,
              display_order,
              duration_seconds,
              thumbnail_object_key
            ),
            creator:users (
              id,
              full_name
            )
          `
          )
          .in('project_id', projectIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (updatesError) throw updatesError;

        return (updates || []) as ProjectUpdate[];
      } else {
        // Single project
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updates, error } = await (supabase as any)
          .from('project_updates')
          .select(
            `
            *,
            project:projects (
              id,
              name,
              target_language_entity_id,
              language_entity:language_entities (
                id,
                name
              )
            ),
            media:project_updates_media (
              id,
              media_type,
              object_key,
              storage_provider,
              original_filename,
              file_type,
              caption,
              display_order,
              duration_seconds,
              thumbnail_object_key
            ),
            creator:users (
              id,
              full_name
            )
          `
          )
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (updates || []) as ProjectUpdate[];
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
  });
}

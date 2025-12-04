import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  normalizeSupabaseRelation,
  normalizeSupabaseRelations,
} from '@/shared/utils/supabase-helpers';
import type { ProjectUpdate } from '../types';

export function useProjectUpdates(
  projectId: string | 'all',
  partnerOrgId?: string
) {
  return useQuery({
    queryKey: ['project-updates', projectId, partnerOrgId],
    queryFn: async () => {
      if (projectId === 'all') {
        const { data: projects } = await (supabase as any)
          .from('partner_orgs_projects')
          .select('project_id')
          .eq('partner_org_id', partnerOrgId!)
          .is('unassigned_at', null);

        const projectIds = projects?.map((p: any) => p.project_id) || [];

        const { data: updates, error: updatesError } = await (supabase as any)
          .from('project_updates')
          .select(
            `
            *,
            project:projects (
              id,
              name,
              target_language_entity_id,
              language_entity:language_entities!projects_target_language_entity_id_fkey (
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
            )
          `
          )
          .in('project_id', projectIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (updatesError) throw updatesError;

        return (updates || []).map((update: any) => ({
          ...update,
          project: normalizeSupabaseRelation(update.project),
          project_language_entity: update.project
            ? normalizeSupabaseRelation(update.project.language_entity)
            : null,
          media: normalizeSupabaseRelations(update.media),
          creator: null,
        })) as ProjectUpdate[];
      } else {
        const { data: updates, error } = await (supabase as any)
          .from('project_updates')
          .select(
            `
            *,
            project:projects (
              id,
              name,
              target_language_entity_id,
              language_entity:language_entities!projects_target_language_entity_id_fkey (
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
            )
          `
          )
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (updates || []).map((update: any) => ({
          ...update,
          project: normalizeSupabaseRelation(update.project),
          project_language_entity: update.project
            ? normalizeSupabaseRelation(update.project.language_entity)
            : null,
          media: normalizeSupabaseRelations(update.media),
          creator: null,
        })) as ProjectUpdate[];
      }
    },
    enabled: !!(projectId && (projectId !== 'all' || partnerOrgId)),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

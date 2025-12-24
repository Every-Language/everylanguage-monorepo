import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  normalizeSupabaseRelation,
  normalizeSupabaseRelations,
} from '@/shared/utils/supabase-helpers';
import type { PartnerOrgUpdate } from '../types';

export function usePartnerOrgUpdates(partnerOrgId: string) {
  return useQuery({
    queryKey: ['partner-org-updates', partnerOrgId],
    queryFn: async () => {
      // Get project IDs for this partner org
      const { data: projects } = await (supabase as any)
        .from('partner_orgs_projects')
        .select('project_id')
        .eq('partner_org_id', partnerOrgId)
        .is('unassigned_at', null);

      const projectIds = projects?.map((p: any) => p.project_id) || [];

      if (projectIds.length === 0) {
        return [];
      }

      // Fetch ONLY manually created project_updates
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
            original_filename,
            caption,
            display_order
          )
        `
        )
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform to PartnerOrgUpdate format
      const projectUpdates: PartnerOrgUpdate[] = (updates ?? []).map(
        (update: any) => {
          const project = normalizeSupabaseRelation(update.project);
          const languageEntity = project?.language_entity
            ? normalizeSupabaseRelation(project.language_entity)
            : null;

          return {
            id: update.id,
            type: 'project_update' as const,
            timestamp: update.created_at,
            project_id: update.project_id,
            project_name: project?.name,
            language_name: languageEntity?.name,
            title: update.title,
            body: update.body,
            media_keys: normalizeSupabaseRelations(update.media)
              .map((m: any) => m.object_key)
              .filter(Boolean),
            project,
            media: normalizeSupabaseRelations(update.media),
            creator: null,
          };
        }
      );

      return projectUpdates;
    },
    enabled: !!partnerOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - updates don't change frequently
  });
}

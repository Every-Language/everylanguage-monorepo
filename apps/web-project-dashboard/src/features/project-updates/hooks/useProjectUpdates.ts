import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { ProjectUpdateWithRelations } from '../types';

export function useProjectUpdates(projectId: string | null) {
  return useQuery({
    queryKey: ['project-updates', projectId],
    queryFn: async () => {
      if (!projectId) {
        return [];
      }

      const { data: updates, error } = await (
        supabase as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (
                column: string,
                value: string
              ) => {
                is: (
                  column: string,
                  value: null
                ) => {
                  order: (
                    column: string,
                    options: { ascending: boolean }
                  ) => {
                    limit: (
                      count: number
                    ) => Promise<{ data: unknown; error: unknown }>;
                  };
                };
              };
            };
          };
        }
      )
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
            file_size,
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
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return (updates || []) as ProjectUpdateWithRelations[];
    },
    enabled: !!projectId,
  });
}

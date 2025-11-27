import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export function useProjectListeningSessions(projectId: string) {
  return useQuery({
    queryKey: ['project-listening-sessions', projectId],
    queryFn: async () => {
      if (!projectId) {
        return 0;
      }

      // Get project's target_language_entity_id
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

      // Query distinct sessions that have listens for this language
      // Get session IDs from media_file_listens
      const { data: mediaListens, error: mediaError } = await (supabase as any)
        .from('media_file_listens')
        .select('session_id')
        .eq('language_entity_id', languageEntityId);

      if (mediaError) {
        console.error('Error fetching media file listens:', mediaError);
        return 0;
      }

      // Also get from verse_listens
      const { data: verseListens, error: verseError } = await (supabase as any)
        .from('verse_listens')
        .select('session_id')
        .eq('language_entity_id', languageEntityId);

      if (verseError) {
        console.error('Error fetching verse listens:', verseError);
      }

      // Combine and get unique session IDs
      const sessionIds = new Set<string>();
      mediaListens?.forEach((item: any) => {
        if (item.session_id) sessionIds.add(item.session_id);
      });
      verseListens?.forEach((item: any) => {
        if (item.session_id) sessionIds.add(item.session_id);
      });

      return sessionIds.size;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

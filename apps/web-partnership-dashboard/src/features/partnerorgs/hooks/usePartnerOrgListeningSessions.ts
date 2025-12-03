import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import { usePartnerOrgProjects } from './usePartnerOrgProjects';

export function usePartnerOrgListeningSessions(partnerOrgId: string) {
  const { data: projects } = usePartnerOrgProjects(partnerOrgId);

  return useQuery({
    queryKey: ['partner-org-listening-sessions', partnerOrgId],
    queryFn: async () => {
      if (!projects || projects.length === 0) {
        return 0;
      }

      // Get unique language_entity_ids from projects
      const languageEntityIds = Array.from(
        new Set(
          projects
            .map(p => p.language_entity_id)
            .filter((id): id is string => !!id)
        )
      );

      if (languageEntityIds.length === 0) {
        return 0;
      }

      // Query distinct sessions that have listens for these languages
      // Get session IDs from media_file_listens
      const { data: mediaListens, error: mediaError } = await (supabase as any)
        .from('media_file_listens')
        .select('session_id')
        .in('language_entity_id', languageEntityIds);

      if (mediaError) {
        console.error('Error fetching media file listens:', mediaError);
        return 0;
      }

      // Also get from verse_listens
      const { data: verseListens, error: verseError } = await (supabase as any)
        .from('verse_listens')
        .select('session_id')
        .in('language_entity_id', languageEntityIds);

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
    enabled: !!partnerOrgId && !!projects,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

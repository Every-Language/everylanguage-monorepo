import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type LanguageStatsContextual = {
  language_entity_id: string;
  population: number | null;
  people_group_count: number | null;
};

/**
 * Hook to fetch contextual language stats in a region
 * Queries languages_regions_stats view for contextual stats
 */
export function useLanguageStatsContextual(
  languageEntityId: string | null,
  regionId: string | null
): UseQueryResult<LanguageStatsContextual | null> {
  return useQuery({
    queryKey: ['language-stats-contextual', languageEntityId, regionId],
    queryFn: async () => {
      if (!languageEntityId || !regionId) return null;

      const { data, error } = await supabase
        .from('languages_regions_stats')
        .select('language_entity_id, population, people_group_count')
        .eq('region_id', regionId)
        .eq('language_entity_id', languageEntityId)
        .single();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as LanguageStatsContextual;
    },
    enabled: !!languageEntityId && !!regionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

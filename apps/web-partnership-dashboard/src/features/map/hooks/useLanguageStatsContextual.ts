import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type LanguageStatsContextual = {
  language_entity_id: string;
  language_name: string;
  population: number | null;
  people_group_count: number | null;
  country_count: number | null;
  bible_status: number | null;
  has_audio_recordings: boolean | null;
  has_jesus_film: boolean | null;
};

/**
 * Hook to fetch contextual language stats in a region
 * Queries vw_languages_in_region view for instance-level stats
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
        .from('vw_languages_in_region')
        .select(
          'language_entity_id, language_name, population, people_group_count, country_count, bible_status, has_audio_recordings, has_jesus_film'
        )
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

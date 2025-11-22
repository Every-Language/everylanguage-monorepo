import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type RegionStatsContextual = {
  region_id: string;
  region_name: string;
  region_population: number | null;
  region_people_group_count: number | null;
  region_language_count: number | null;
  languages_no_scripture: number | null;
  languages_portions: number | null;
  languages_new_testament: number | null;
  languages_full_bible: number | null;
  percent_christianity: number | null;
  percent_islam: number | null;
  percent_buddhism: number | null;
  percent_hinduism: number | null;
  percent_ethnic_religions: number | null;
  percent_non_religious: number | null;
  percent_other_small: number | null;
};

/**
 * Hook to fetch contextual region stats for a language
 * Queries vw_regions_for_language view for instance-level stats
 */
export function useRegionStatsContextual(
  regionId: string | null,
  languageEntityId: string | null
): UseQueryResult<RegionStatsContextual | null> {
  return useQuery({
    queryKey: ['region-stats-contextual', regionId, languageEntityId],
    queryFn: async () => {
      if (!regionId || !languageEntityId) return null;

      const { data, error } = await supabase
        .from('vw_regions_for_language')
        .select(
          'region_id, region_name, region_population, region_people_group_count, region_language_count, languages_no_scripture, languages_portions, languages_new_testament, languages_full_bible, percent_christianity, percent_islam, percent_buddhism, percent_hinduism, percent_ethnic_religions, percent_non_religious, percent_other_small'
        )
        .eq('language_entity_id', languageEntityId)
        .eq('region_id', regionId)
        .single();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as RegionStatsContextual;
    },
    enabled: !!regionId && !!languageEntityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

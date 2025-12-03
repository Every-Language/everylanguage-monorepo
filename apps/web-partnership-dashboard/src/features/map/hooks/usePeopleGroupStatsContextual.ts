import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type PeopleGroupStatsContextual = {
  people_group_id: string;
  people_group_name: string;
  peop_name_in_country: string | null;
  instance_population: number | null;
  population: number | null; // Total population from MV
  language_count: number | null;
  country_count: number | null;
  primary_language_bible_status: number | null;
  image_url: string | null;
};

/**
 * Hook to fetch contextual people group stats in a region
 * Queries vw_people_groups_in_region view for instance-level stats
 */
export function usePeopleGroupStatsContextual(
  peopleGroupId: string | null,
  regionId: string | null
): UseQueryResult<PeopleGroupStatsContextual | null> {
  return useQuery({
    queryKey: ['people-group-stats-contextual', peopleGroupId, regionId],
    queryFn: async () => {
      if (!peopleGroupId || !regionId) return null;

      const { data, error } = await supabase
        .from('vw_people_groups_in_region')
        .select(
          'people_group_id, people_group_name, peop_name_in_country, instance_population, population, language_count, country_count, primary_language_bible_status, image_url'
        )
        .eq('region_id', regionId)
        .eq('people_group_id', peopleGroupId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 404 errors

      if (error) {
        // If no data found, return null (not an error)
        // PGRST116 = no rows returned, PGRST301 = resource not found
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return data as PeopleGroupStatsContextual;
    },
    enabled: !!peopleGroupId && !!regionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404s
  });
}

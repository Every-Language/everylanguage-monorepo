import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type PeopleGroupStatsContextual = {
  people_group_id: string;
  population: number | null;
  language_count: number | null;
  name: string | null;
  primary_language_id: string | null;
};

/**
 * Hook to fetch contextual people group stats in a region
 * Queries people_groups_regions_stats view for contextual stats
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
        .from('people_groups_regions_stats')
        .select(
          'people_group_id, population, language_count, name, primary_language_id'
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

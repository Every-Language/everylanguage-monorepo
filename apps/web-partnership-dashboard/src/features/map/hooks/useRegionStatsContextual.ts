import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type RegionStatsContextual = {
  region_id: string;
  population: number | null;
  people_group_count: number | null;
};

/**
 * Hook to fetch contextual region stats for a language
 * Queries languages_regions_stats view for contextual stats
 * Note: This view shows language-region contextual stats, not region-level stats
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
        .from('languages_regions_stats')
        .select('region_id, population, people_group_count')
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

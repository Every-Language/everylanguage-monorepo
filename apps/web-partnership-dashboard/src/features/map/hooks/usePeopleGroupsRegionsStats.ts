/**
 * Hook to fetch contextual people group-region stats from people_groups_regions_stats view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { PeopleGroupRegionStats } from '../types/stats';

export type PeopleGroupsRegionsStatsFilters = {
  peopleGroupId?: string | null;
  regionId?: string | null;
};

/**
 * Fetches contextual people group-region stats
 * @param filters - Optional filters: peopleGroupId and/or regionId
 * @returns PeopleGroupRegionStats[]
 */
export function usePeopleGroupsRegionsStats(
  filters: PeopleGroupsRegionsStatsFilters = {}
): UseQueryResult<PeopleGroupRegionStats[]> {
  const { peopleGroupId, regionId } = filters;

  return useQuery({
    queryKey: ['people-groups-regions-stats', peopleGroupId, regionId],
    queryFn: async () => {
      let query = supabase.from('people_groups_regions_stats').select('*');

      if (peopleGroupId) {
        query = query.eq('people_group_id', peopleGroupId);
      }

      if (regionId) {
        query = query.eq('region_id', regionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as PeopleGroupRegionStats[]) || [];
    },
    enabled: !!(peopleGroupId || regionId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

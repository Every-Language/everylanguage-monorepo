/**
 * Hook to fetch people group stats from people_groups_stats materialized view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { PeopleGroupStats } from '../types/stats';

/**
 * Fetches people group stats for a single people group
 * @param peopleGroupId - The people group ID
 * @returns PeopleGroupStats | null
 */
export function usePeopleGroupStats(
  peopleGroupId: string | null
): UseQueryResult<PeopleGroupStats | null> {
  return useQuery({
    queryKey: ['people-group-stats', peopleGroupId],
    queryFn: async () => {
      if (!peopleGroupId) return null;

      const { data, error } = await supabase
        .from('people_groups_stats')
        .select('*')
        .eq('people_group_id', peopleGroupId)
        .maybeSingle();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null;
        }
        throw error;
      }

      return data ? (data as unknown as PeopleGroupStats) : null;
    },
    enabled: !!peopleGroupId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404s
  });
}

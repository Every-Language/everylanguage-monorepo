/**
 * Hook to fetch region stats from region_stats materialized view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { RegionStats } from '../types/stats';

/**
 * Fetches region stats for a single region
 * @param regionId - The region ID
 * @returns RegionStats | null
 */
export function useRegionStats(
  regionId: string | null
): UseQueryResult<RegionStats | null> {
  return useQuery({
    queryKey: ['region-stats', regionId],
    queryFn: async () => {
      if (!regionId) return null;

      const { data, error } = await supabase
        .from('region_stats')
        .select('*')
        .eq('region_id', regionId)
        .maybeSingle();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null;
        }
        throw error;
      }

      return data ? (data as unknown as RegionStats) : null;
    },
    enabled: !!regionId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404s
  });
}

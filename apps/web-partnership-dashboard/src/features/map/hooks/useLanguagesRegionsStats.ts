/**
 * Hook to fetch contextual language-region stats from languages_regions_stats view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { LanguageRegionStats } from '../types/stats';

export type LanguagesRegionsStatsFilters = {
  languageEntityId?: string | null;
  regionId?: string | null;
};

/**
 * Fetches contextual language-region stats
 * @param filters - Optional filters: languageEntityId and/or regionId
 * @returns LanguageRegionStats[]
 */
export function useLanguagesRegionsStats(
  filters: LanguagesRegionsStatsFilters = {}
): UseQueryResult<LanguageRegionStats[]> {
  const { languageEntityId, regionId } = filters;

  return useQuery({
    queryKey: ['languages-regions-stats', languageEntityId, regionId],
    queryFn: async () => {
      let query = supabase.from('languages_regions_stats').select('*');

      if (languageEntityId) {
        query = query.eq('language_entity_id', languageEntityId);
      }

      if (regionId) {
        query = query.eq('region_id', regionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as LanguageRegionStats[]) || [];
    },
    enabled: !!(languageEntityId || regionId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

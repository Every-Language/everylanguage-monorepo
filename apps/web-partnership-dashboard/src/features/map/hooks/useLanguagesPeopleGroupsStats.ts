/**
 * Hook to fetch contextual language-people group stats from languages_people_groups_stats view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { LanguagePeopleGroupStats } from '../types/stats';

export type LanguagesPeopleGroupsStatsFilters = {
  languageEntityId?: string | null;
  peopleGroupId?: string | null;
};

/**
 * Fetches contextual language-people group stats
 * @param filters - Optional filters: languageEntityId and/or peopleGroupId
 * @returns LanguagePeopleGroupStats[]
 */
export function useLanguagesPeopleGroupsStats(
  filters: LanguagesPeopleGroupsStatsFilters = {}
): UseQueryResult<LanguagePeopleGroupStats[]> {
  const { languageEntityId, peopleGroupId } = filters;

  return useQuery({
    queryKey: [
      'languages-people-groups-stats',
      languageEntityId,
      peopleGroupId,
    ],
    queryFn: async () => {
      let query = supabase.from('languages_people_groups_stats').select('*');

      if (languageEntityId) {
        query = query.eq('language_entity_id', languageEntityId);
      }

      if (peopleGroupId) {
        query = query.eq('people_group_id', peopleGroupId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as LanguagePeopleGroupStats[]) || [];
    },
    enabled: !!(languageEntityId || peopleGroupId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

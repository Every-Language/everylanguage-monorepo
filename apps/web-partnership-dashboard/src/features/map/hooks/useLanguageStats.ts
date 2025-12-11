/**
 * Hook to fetch language stats from language_stats materialized view
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import type { LanguageStats } from '../types/stats';

/**
 * Fetches language stats for a single language entity
 * @param languageEntityId - The language entity ID
 * @returns LanguageStats | null
 */
export function useLanguageStats(
  languageEntityId: string | null
): UseQueryResult<LanguageStats | null> {
  return useQuery({
    queryKey: ['language-stats', languageEntityId],
    queryFn: async () => {
      if (!languageEntityId) return null;

      const { data, error } = await supabase
        .from('language_stats')
        .select('*')
        .eq('language_entity_id', languageEntityId)
        .maybeSingle();

      if (error) {
        // If no data found, return null (not an error)
        if (error.code === 'PGRST116' || error.code === 'PGRST301') {
          return null;
        }
        throw error;
      }

      return data ? (data as unknown as LanguageStats) : null;
    },
    enabled: !!languageEntityId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404s
  });
}

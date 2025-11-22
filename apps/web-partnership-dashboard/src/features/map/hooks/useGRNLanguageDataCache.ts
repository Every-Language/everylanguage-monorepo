/**
 * Cache-first hook for GRN language data
 *
 * Fetches language feed from local cache (grn_language_cache) with fallback to API.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type GRNLanguageFeed,
  type ExternalIdSource,
  extractISO6393FromLanguageSources,
  extractROLVFromLanguageSources,
  fetchLanguageFeed,
  fetchISOFeed,
} from '../services/grnApi';

/**
 * Fetches external ID sources for a language entity from our database
 */
function useLanguageExternalIds(languageEntityId: string | null) {
  return useQuery({
    queryKey: ['language-external-ids', languageEntityId],
    queryFn: async () => {
      if (!languageEntityId) return [];

      const { data, error } = await supabase
        .from('language_entity_sources')
        .select('external_id_type, external_id, source')
        .eq('language_entity_id', languageEntityId)
        .eq('is_external', true);

      if (error) throw error;
      return (data || []) as ExternalIdSource[];
    },
    enabled: !!languageEntityId,
    staleTime: 60 * 60 * 1000, // 1 hour - external IDs rarely change
  });
}

const CACHE_CONFIG = {
  staleTime: 60 * 60 * 1000, // 1 hour - cache data doesn't change frequently
  gcTime: 24 * 60 * 60 * 1000, // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

/**
 * Fetches GRN language feed from cache first, with API fallback
 *
 * Returns data in GRNLanguageFeed format for compatibility with existing components
 */
export function useGRNLanguageDataCache(
  languageEntityId: string | null
): UseQueryResult<GRNLanguageFeed | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;
  const grnId = externalIds
    ? extractROLVFromLanguageSources(externalIds)
    : null;

  return useQuery({
    queryKey: ['grn-language-data-cache', languageEntityId, iso6393],
    queryFn: async () => {
      // Try cache first
      if (iso6393) {
        try {
          // Fetch from grn_language_cache
          const { data: cacheData, error: cacheError } = await supabase
            .from('grn_language_cache')
            .select('*')
            .eq('iso639_3', iso6393.toLowerCase())
            .single();

          if (!cacheError && cacheData && cacheData.programs) {
            // Transform cache data to GRNLanguageFeed format
            const languageFeed: GRNLanguageFeed = {
              id: cacheData.grn_language_id || 0,
              name: cacheData.language_name || iso6393,
              nameIetf: cacheData.name_ietf || cacheData.ietf || '',
              audioSample: cacheData.audio_sample || false,
              ietf: cacheData.ietf || '',
              iso: iso6393,
              mediaIds: cacheData.media_ids || [],
              alternateNames: cacheData.alternate_names || [],
              programs: cacheData.programs as { program: any[] },
              version: 1,
              fetchTime: cacheData.last_synced_at || new Date().toISOString(),
            };

            return languageFeed;
          }
        } catch (error) {
          // Cache fetch failed, fall through to API fallback
          console.warn(
            `GRN cache fetch failed for language ${iso6393}, falling back to API:`,
            error
          );
        }
      }

      // Fallback to API - need to get GRN language ID first
      let grnLanguageNumber = grnId;

      // If we don't have GRN ID directly, try to get it from ISO feed
      if (!grnLanguageNumber && iso6393) {
        try {
          const isoFeed = await fetchISOFeed(iso6393);
          grnLanguageNumber =
            isoFeed?.grnIds?.pair?.[0]?.id?.toString() || null;
        } catch (error) {
          console.warn(
            `Failed to fetch GRN ID from ISO feed for ${iso6393}:`,
            error
          );
        }
      }

      // Fetch from API if we have a GRN language number
      if (grnLanguageNumber) {
        return await fetchLanguageFeed(grnLanguageNumber);
      }

      return null;
    },
    enabled: !!(iso6393 || grnId) && !idsLoading,
    ...CACHE_CONFIG,
  });
}

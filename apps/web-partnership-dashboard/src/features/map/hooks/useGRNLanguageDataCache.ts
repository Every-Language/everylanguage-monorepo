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
import type { GrnLanguageCache } from '../types/databaseViews';

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
    queryKey: ['grn-language-data-cache', languageEntityId, iso6393, grnId],
    queryFn: async () => {
      // Helper function to transform cache data to GRNLanguageFeed format
      const transformCacheData = (
        cacheData: GrnLanguageCache,
        iso: string
      ): GRNLanguageFeed => {
        // Handle programs - can be null or an array, need to wrap in { program: [...] } format
        const programsData = cacheData.programs;
        let programs: { program: any[] };
        if (Array.isArray(programsData)) {
          programs = { program: programsData };
        } else if (
          programsData &&
          typeof programsData === 'object' &&
          'program' in programsData
        ) {
          programs = programsData as { program: any[] };
        } else {
          programs = { program: [] };
        }

        return {
          id: cacheData.grn_language_id || 0,
          name: cacheData.language_name || iso,
          nameIetf: cacheData.name_ietf || cacheData.ietf || '',
          audioSample: cacheData.audio_sample || false,
          ietf: cacheData.ietf || '',
          iso: iso,
          mediaIds:
            (cacheData.media_ids as
              | { org_key: number; code: string }[]
              | null) || [],
          alternateNames:
            (cacheData.alternate_names as
              | { name: string; ietf: string; best?: string }[]
              | null) || [],
          programs: programs,
          version: 1,
          fetchTime: cacheData.last_synced_at || new Date().toISOString(),
        };
      };

      // Strategy 1: Query by GRN Language ID if available (most specific, always unique)
      if (grnId) {
        try {
          const grnIdNumber = parseInt(grnId, 10);
          if (!isNaN(grnIdNumber)) {
            const { data: cacheDataRaw, error: cacheError } = await supabase
              .from('grn_language_cache')
              .select('*')
              .eq('grn_language_id', grnIdNumber)
              .single();

            const cacheData = cacheDataRaw as GrnLanguageCache | null;
            // Use cache data if found (even if programs is null - that's valid data)
            if (!cacheError && cacheData) {
              return transformCacheData(
                cacheData,
                cacheData.iso639_3 || iso6393 || ''
              );
            }
          }
        } catch (error) {
          // Cache fetch failed, fall through to next strategy
          console.warn(
            `GRN cache fetch by GRN ID ${grnId} failed, trying ISO lookup:`,
            error
          );
        }
      }

      // Strategy 2: Query by ISO code (with GRN ID filter if available to handle multiple matches)
      if (iso6393) {
        try {
          let query = supabase
            .from('grn_language_cache')
            .select('*')
            .eq('iso639_3', iso6393.toLowerCase());

          // If we have a GRN ID, filter by it to get the specific language variant
          if (grnId) {
            const grnIdNumber = parseInt(grnId, 10);
            if (!isNaN(grnIdNumber)) {
              query = query.eq('grn_language_id', grnIdNumber);
            }
          }

          const { data: cacheDataRaw, error: cacheError } =
            await query.single();

          const cacheData = cacheDataRaw as GrnLanguageCache | null;
          // Use cache data if found (even if programs is null - that's valid data)
          if (!cacheError && cacheData) {
            return transformCacheData(cacheData, iso6393);
          }

          // If single() failed due to multiple matches, try getting first match
          // This handles cases where ISO matches multiple but we don't have GRN ID
          if (cacheError && cacheError.code === 'PGRST116') {
            const { data: cacheDataArray, error: arrayError } = await supabase
              .from('grn_language_cache')
              .select('*')
              .eq('iso639_3', iso6393.toLowerCase())
              .limit(1);

            // Use cache data if found (even if programs is null - that's valid data)
            if (!arrayError && cacheDataArray && cacheDataArray.length > 0) {
              return transformCacheData(cacheDataArray[0], iso6393);
            }
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

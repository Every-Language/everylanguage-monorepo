/**
 * Cache-first hook for Joshua Project language data
 *
 * Fetches language statistics from mv_language_stats materialized view.
 * Returns the same structure as useJPLanguageData for drop-in replacement.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type JPLanguage,
  type ExternalIdSource,
  fetchLanguageStats,
  extractROL3FromLanguageSources,
} from '../services/joshuaProjectApi';
import type { JPLanguageCache } from '../types/databaseViews';

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
        .select('external_id_type, external_id')
        .eq('language_entity_id', languageEntityId)
        .not('external_id', 'is', null)
        .is('deleted_at', null);

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
 * Fetches language statistics from mv_language_stats cache
 *
 * Returns data in JPLanguage format for compatibility with existing components
 */
function useJPLanguageStatsCache(
  languageEntityId: string | null
): UseQueryResult<JPLanguage | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-language-data-cache', languageEntityId],
    queryFn: async () => {
      // Try cache first
      if (languageEntityId) {
        try {
          console.log(
            `[useJPLanguageStatsCache] Attempting cache lookup for language: ${languageEntityId}`
          );
          // Fetch from mv_language_stats
          const { data: cacheDataRaw, error: cacheError } = await supabase
            .from('mv_language_stats')
            .select('*')
            .eq('language_entity_id', languageEntityId)
            .single();

          const cacheData = cacheDataRaw as JPLanguageCache | null;
          if (!cacheError && cacheData) {
            console.log(
              `[useJPLanguageStatsCache] ✅ CACHE HIT for language: ${languageEntityId}`
            );
            // Transform cache data to JPLanguage format
            const languageData: JPLanguage = {
              ROL3: (cacheData.rolv_code || cacheData.iso639_3 || '') as string,
              Language: (cacheData.language_name ||
                cacheData.iso639_3 ||
                '') as string,
              HubCountry: (cacheData.hub_country as string | null) || '',
              HubCountryISO: '', // Not available in cache
              PoplPeoplesLR:
                (cacheData.least_reached_population as number | null) &&
                (cacheData.least_reached_population as number) > 0
                  ? (cacheData.least_reached_population as number)
                  : null,
              PoplPeoplesFPG:
                (cacheData.frontier_population as number | null) &&
                (cacheData.frontier_population as number) > 0
                  ? (cacheData.frontier_population as number)
                  : null,
              PoplPeoples:
                (cacheData.population as number | null) &&
                (cacheData.population as number) > 0
                  ? (cacheData.population as number)
                  : null,
              JPScalePC: (cacheData.jp_scale as number | null) ?? null,
              PercentChristianPC: (cacheData.percent_christian as number | null)
                ? parseFloat(String(cacheData.percent_christian))
                : 0,
              PercentEvangelicalPC: (cacheData.percent_evangelical as
                | number
                | null)
                ? parseFloat(String(cacheData.percent_evangelical))
                : 0,
              BibleYear: cacheData.bible_year
                ? parseInt(String(cacheData.bible_year), 10)
                : null,
              NTYear: cacheData.nt_year
                ? parseInt(String(cacheData.nt_year), 10)
                : null,
              PortionsYear: cacheData.portions_year
                ? parseInt(String(cacheData.portions_year), 10)
                : null,
              PrimaryReligion:
                (cacheData.primary_religion as string | null) || '',
              JPScaleText: null, // Not available in cache
              TranslationNeedQuestionable:
                (cacheData.translation_need_questionable as boolean | null)
                  ? 1
                  : 0,
              AudioRecordings: (cacheData.has_audio_recordings as
                | boolean
                | null)
                ? 'Y'
                : null,
              BibleTranslationNeed: '', // Not available in cache
              GospelAccess: null, // Not available in cache
              PercentEvangelical: (cacheData.percent_evangelical as
                | number
                | null)
                ? parseFloat(String(cacheData.percent_evangelical))
                : 0,
              NTPrimaryText: null, // Not available in cache
              BiblePrimaryText: null, // Not available in cache
              NTPrimaryAudio: null, // Not available in cache
              BiblePrimaryAudio: null, // Not available in cache
              TranslationNeed: '', // Not available in cache
              Countries:
                (cacheData.country_count as number | null | undefined) ??
                (cacheData.nbr_countries as number | null) ??
                0,
              Peoples:
                (cacheData.people_group_count as number | null | undefined) ??
                (cacheData.nbr_pgics as number | null) ??
                0,
              HasJesusFilm: (cacheData.has_jesus_film as boolean | null)
                ? 'Y'
                : null,
              JF: (cacheData.has_jesus_film as boolean | null) ? 'Y' : null,
              HasAudioRecordings: (cacheData.has_audio_recordings as
                | boolean
                | null)
                ? 'Y'
                : null,
              BibleStatus:
                (cacheData.bible_status as number | null) !== null
                  ? (cacheData.bible_status as number)
                  : null,
              WebLangText: null,
              Status: (cacheData.status as string | null) ?? null,
              GRN_URL: (cacheData.grn_url as string | null) ?? null,
              JF_URL: (cacheData.jf_url as string | null) ?? null,
              FCBH_URL: (cacheData.fcbh_url as string | null) ?? null,
              NbrPGICs:
                (cacheData.people_group_count as number | null | undefined) ??
                (cacheData.nbr_pgics as number | null) ??
                null,
              NbrCountries:
                (cacheData.country_count as number | null | undefined) ??
                (cacheData.nbr_countries as number | null) ??
                null,
              PercentAdherents: (cacheData.percent_christian as number | null)
                ? parseFloat(String(cacheData.percent_christian))
                : null,
              LeastReached: (cacheData.least_reached as boolean | null)
                ? 'Y'
                : null,
              RLG3: (cacheData.religion_code as string | number | null)
                ? parseInt(String(cacheData.religion_code), 10)
                : null,
            };

            return languageData;
          } else {
            // Cache query succeeded but no data found
            console.log(
              `[useJPLanguageStatsCache] ⚠️ CACHE MISS for language: ${languageEntityId} - No data found`,
              {
                cacheError: cacheError?.code,
                cacheErrorMsg: cacheError?.message,
              }
            );
          }
        } catch (error) {
          // Cache fetch failed, fall through to API fallback
          console.warn(
            `[useJPLanguageStatsCache] ⚠️ CACHE ERROR for language ${languageEntityId}, falling back to API:`,
            error
          );
        }
      }

      // Fallback to API if cache miss or error
      if (rol3) {
        console.log(
          `[useJPLanguageStatsCache] 🔄 API FALLBACK for language: ${languageEntityId} (ROL3: ${rol3})`
        );
        const apiData = await fetchLanguageStats(rol3);
        console.log(
          `[useJPLanguageStatsCache] ${apiData ? '✅ API SUCCESS' : '❌ API RETURNED NULL'} for language: ${languageEntityId}`
        );
        return apiData;
      }

      console.log(
        `[useJPLanguageStatsCache] ❌ NO API FALLBACK - Missing ROL3 for language: ${languageEntityId}`,
        { externalIds, rol3 }
      );
      return null;
    },
    enabled: !!languageEntityId && !idsLoading,
    ...CACHE_CONFIG,
  });
}

import { useJPPeopleGroupsByLanguagePaginated } from './useJoshuaProject';

/**
 * Combined hook that fetches language stats and people groups
 * Matches the interface of useJPLanguageData for drop-in replacement
 */
export function useJPLanguageDataCache(languageEntityId: string | null) {
  const languageStats = useJPLanguageStatsCache(languageEntityId);
  // Still fetch people groups for compatibility (though population comes from MV)
  const peopleGroups = useJPPeopleGroupsByLanguagePaginated(
    languageEntityId,
    1, // First page
    100, // Larger page size for initial fetch
    'Population',
    'desc'
  );

  return {
    languageStats: languageStats.data,
    peopleGroups: peopleGroups.data || [],
    isLoading: languageStats.isLoading || peopleGroups.isLoading,
    error: languageStats.error || peopleGroups.error,
    hasData: !!(languageStats.data || peopleGroups.data?.length),
  };
}

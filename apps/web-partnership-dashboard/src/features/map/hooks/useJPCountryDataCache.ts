/**
 * Cache-first hook for Joshua Project country data
 *
 * Fetches country statistics from mv_region_stats materialized view.
 * Returns the same structure as useJPCountryData for drop-in replacement.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type JPCountry,
  type ExternalIdSource,
  fetchCountryStats,
  fetchCountryStatsByFIPS,
  extractFIPSFromRegionSources,
  extractISO3FromRegionSources,
} from '../services/joshuaProjectApi';
import { useJPPeopleGroupsByCountryPaginated } from './useJoshuaProject';
import type { JPCountryCache } from '../types/databaseViews';

/**
 * Fetches external ID sources for a region from our database
 */
function useRegionExternalIds(regionId: string | null) {
  return useQuery({
    queryKey: ['region-external-ids', regionId],
    queryFn: async () => {
      if (!regionId) return [];

      const { data, error } = await supabase
        .from('region_sources')
        .select('external_id_type, external_id')
        .eq('region_id', regionId)
        .not('external_id', 'is', null)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as ExternalIdSource[];
    },
    enabled: !!regionId,
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
 * Fetches country statistics from mv_region_stats cache
 *
 * Returns data in JPCountry format for compatibility with existing components
 */
export function useJPCountryStatsCache(
  regionId: string | null
): UseQueryResult<JPCountry | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-country-stats-cache', regionId, fips || iso3],
    queryFn: async () => {
      // Try cache first
      if (regionId) {
        try {
          console.log(
            `[useJPCountryStatsCache] Attempting cache lookup for region: ${regionId}`
          );
          // Fetch from mv_region_stats
          const { data: cacheDataRaw, error: cacheError } = await supabase
            .from('mv_region_stats')
            .select('*')
            .eq('region_id', regionId)
            .single();

          const cacheData = cacheDataRaw as JPCountryCache | null;
          if (!cacheError && cacheData) {
            console.log(
              `[useJPCountryStatsCache] ✅ CACHE HIT for region: ${regionId}`
            );
            // Transform cache data to JPCountry format
            const countryData: JPCountry = {
              ROG3: cacheData.rog3 || '',
              Ctry: cacheData.region_name || '',
              RegionCode: cacheData.region_code?.toString() || '',
              RegionName:
                cacheData.jp_region_name || cacheData.region_name || '',
              ContinentCode: cacheData.continent_code || '',
              ContinentName: cacheData.continent_name || '',
              WindowStatus: cacheData.window_status || null,
              ISO3: cacheData.iso3 || '',
              ISO2: cacheData.iso2 || '',
              ROG2: cacheData.iso2 || '', // Use ISO2 as ROG2 fallback
              WBGeo: '', // Not available in cache
              WBIncome: '', // Not available in cache
              WBPopulation: cacheData.population,
              Population: cacheData.population,
              RLR3: '', // Not available in cache
              PrimaryLanguageName: '', // Not available in cache
              PrimaryReligion: cacheData.religion_primary || '',
              ReligionSubdivision: null, // Not available in cache
              RLG3: cacheData.rlg3_primary?.toString() || '',
              PercentChristianPC: cacheData.percent_christianity || 0,
              PercentChristianPD: 0, // Not available in cache
              PercentEvangelical: 0, // Not available in cache (country-level)
              PercentBuddhism: cacheData.percent_buddhism || 0,
              PercentEthnicReligions: cacheData.percent_ethnic_religions || 0,
              PercentHinduism: cacheData.percent_hinduism || 0,
              PercentIslam: cacheData.percent_islam || 0,
              PercentNonReligious: cacheData.percent_non_religious || 0,
              PercentOtherSmall: cacheData.percent_other_small || 0,
              PercentUnknown: 0, // Not available in cache
              PCBuddhism: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_buddhism || 0)) /
                  100
              ),
              PCChristianity: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_christianity || 0)) /
                  100
              ),
              PCEthnicReligions: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_ethnic_religions || 0)) /
                  100
              ),
              PCHinduism: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_hinduism || 0)) /
                  100
              ),
              PCIslam: Math.round(
                ((cacheData.population || 0) * (cacheData.percent_islam || 0)) /
                  100
              ),
              PCNonReligious: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_non_religious || 0)) /
                  100
              ),
              PCOtherSmall: Math.round(
                ((cacheData.population || 0) *
                  (cacheData.percent_other_small || 0)) /
                  100
              ),
              PCUnknown: 0,
              SecurityLevel:
                (cacheData.security_level as number | undefined) || 0,
              LRofTheLRinPC: 0, // Not available in cache
              LRinPC: 0, // Not available in cache
              LeastReachedBasis: '', // Not available in cache
              JPScale:
                (cacheData.jpscale_ctry as number | null | undefined) ?? null,
              JPScaleText: cacheData.jpscale_text || null,
              JPScalePCtxt: null, // Not available in cache
              JPScalePCimg: cacheData.jpscale_image_url || null,
              GospelAccess: null, // Not available in cache
              PhoneDensity: 0, // Not available in cache
              InternetUsage: 0, // Not available in cache
              BibleYear: null, // Not available in cache (country-level)
              NTYear: null, // Not available in cache
              PortionsYear: null, // Not available in cache
              TranslationNeedYear: null, // Not available in cache
              TranslationUnspecified: null, // Not available in cache
              BibleStatus: null, // Not available in cache (country-level)
              BibleTranslationNeed: '', // Not available in cache
              FIPS: cacheData.rog3 || '',
              Longitude: 0, // Not available in cache
              Latitude: 0, // Not available in cache
              JF: '', // Not available in cache (country-level)
              JFPrimaryText: '', // Not available in cache
              JFPrimaryHist: '', // Not available in cache
              GRN: '', // Not available in cache
              AudioScripture: '', // Not available in cache
              障Gospel: '', // Not available in cache
              IndigenousLanguage: null, // Not available in cache
              SomeMediumLanguage: null, // Not available in cache
              PrimaryMediumLanguage: null, // Not available in cache
              MediumTypeGospelPresentation: null, // Not available in cache
              Unengaged: null, // Not available in cache
              RaceCode: null, // Not available in cache
              PeopleGroups:
                (cacheData.people_group_count as number | null | undefined) ??
                null,
              CntPeoples:
                (cacheData.people_group_count as number | null | undefined) ??
                null,
              CntPeoplesLR: null, // Not available in cache
              CntPrimaryLanguages:
                (cacheData.language_count as number | null | undefined) ?? null,
              PercentPeopleGroups: 0, // Not available in cache
              PoplPeoplesLR: null, // Not available in cache
              PoplPeoplesFPG: null, // Not available in cache
              ROL3OfficialLanguage: null, // Not available in cache
              TranslationUnspecifiedCount:
                (cacheData.languages_no_scripture as
                  | number
                  | null
                  | undefined) ?? null,
              TranslationNeeded:
                (cacheData.languages_no_scripture as
                  | number
                  | null
                  | undefined) ?? null,
              TranslationStarted: null, // Not available in cache
              BiblePortions:
                (cacheData.languages_portions as number | null | undefined) ??
                null,
              BibleNewTestament:
                (cacheData.languages_new_testament as
                  | number
                  | null
                  | undefined) ?? null,
              BibleComplete:
                (cacheData.languages_full_bible as number | null | undefined) ??
                null,
              JPScaleCtry:
                (cacheData.jpscale_ctry as number | null | undefined) ?? null,
            };

            return countryData;
          } else {
            // Cache query succeeded but no data found
            console.log(
              `[useJPCountryStatsCache] ⚠️ CACHE MISS for region: ${regionId} - No data found`,
              {
                cacheError: cacheError?.code,
                cacheErrorMsg: cacheError?.message,
              }
            );
          }
        } catch (error) {
          // Cache fetch failed, fall through to API fallback
          console.warn(
            `[useJPCountryStatsCache] ⚠️ CACHE ERROR for region ${regionId}, falling back to API:`,
            error
          );
        }
      }

      // Fallback to API if cache miss or error
      if (fips) {
        console.log(
          `[useJPCountryStatsCache] 🔄 API FALLBACK (FIPS) for region: ${regionId} (FIPS: ${fips})`
        );
        const apiData = await fetchCountryStatsByFIPS(fips);
        console.log(
          `[useJPCountryStatsCache] ${apiData ? '✅ API SUCCESS (FIPS)' : '❌ API RETURNED NULL (FIPS)'} for region: ${regionId}`
        );
        return apiData;
      }
      if (iso3) {
        console.log(
          `[useJPCountryStatsCache] 🔄 API FALLBACK (ISO3) for region: ${regionId} (ISO3: ${iso3})`
        );
        const apiData = await fetchCountryStats(iso3);
        console.log(
          `[useJPCountryStatsCache] ${apiData ? '✅ API SUCCESS (ISO3)' : '❌ API RETURNED NULL (ISO3)'} for region: ${regionId}`
        );
        return apiData;
      }

      console.log(
        `[useJPCountryStatsCache] ❌ NO API FALLBACK - Missing FIPS and ISO3 for region: ${regionId}`,
        { externalIds, fips, iso3 }
      );
      return null;
    },
    enabled: !!(regionId && (fips || iso3)) && !idsLoading,
    ...CACHE_CONFIG,
  });
}

/**
 * Combined hook that fetches country stats and people groups
 * Matches the interface of useJPCountryData for drop-in replacement
 */
export function useJPCountryDataCache(regionId: string | null) {
  const countryStats = useJPCountryStatsCache(regionId);
  // Still fetch people groups for compatibility
  const peopleGroups = useJPPeopleGroupsByCountryPaginated(
    regionId,
    1, // First page
    100, // Larger page size for initial fetch
    'Population',
    'desc'
  );

  return {
    countryStats: countryStats.data,
    peopleGroups: peopleGroups.data || [],
    isLoading: countryStats.isLoading || peopleGroups.isLoading,
    error: countryStats.error || peopleGroups.error,
    hasData: !!(countryStats.data || peopleGroups.data?.length),
  };
}

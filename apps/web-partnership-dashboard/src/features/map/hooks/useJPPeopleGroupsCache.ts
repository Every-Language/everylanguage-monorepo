/**
 * Cache-first hooks for Joshua Project people groups data
 *
 * Fetches people groups from contextual views (people_groups_regions_stats, languages_people_groups_stats)
 * and merges with full stats from people_groups_stats materialized view.
 * Returns data in JPPeopleGroup format for compatibility with existing components.
 *
 * Architecture:
 * - Contextual views provide relationship-specific data (e.g., contextual population, name per region)
 * - people_groups_stats provides total/aggregated stats for the people group entity
 * - This hook merges both to provide complete data for secondary tabs
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type JPPeopleGroup,
  type ExternalIdSource,
  fetchPeopleGroupsByFIPS,
  fetchPeopleGroupsByLanguage,
  extractFIPSFromRegionSources,
  extractROL3FromLanguageSources,
} from '../services/joshuaProjectApi';

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
 * Map sort field from API format to database column name
 */
function mapSortFieldToColumn(sortField: string): string {
  // Map API sort fields to contextual view columns
  // Note: Sorting happens on contextual view, then we fetch full stats
  const fieldMap: Record<string, string> = {
    PeopNameInCountry: 'name', // Contextual name from people_groups_regions_stats
    Population: 'population', // Contextual population
    JPScale: 'jpscale', // Will need to sort after fetching from people_groups_stats
    PercentEvangelical: 'percent_evangelical', // Will need to sort after fetching from people_groups_stats
  };
  return fieldMap[sortField] || 'population';
}

/**
 * Transform cache data to JPPeopleGroup format
 */
function transformPeopleGroupFromCache(data: any): JPPeopleGroup {
  // Transform from people_groups_stats (with optional contextual overrides) to JPPeopleGroup format
  return {
    PeopleID3: data.people_id3?.toString() || '',
    PeopNameInCountry: data.peop_name_in_country || data.name || '',
    ROG3: '', // Not available in stats
    ISO3: '', // Not available in stats
    Ctry: '', // Not available in stats
    PrimaryLanguageName: data.primary_language_name || '',
    PrimaryLanguageDialect: null, // Not available in stats
    ROL3: data.primary_language_rol3 || '',
    PrimaryReligion: data.primary_religion || '',
    RLG3: data.rlg3 || '',
    PercentEvangelical: data.percent_evangelical || 0,
    PercentChristianPC: data.percent_christian_pc || 0,
    PercentChristianPD: data.percent_christian_pd || 0,
    JPScale: data.jpscale,
    JPScaleText: null, // Not available in stats
    JPScalePCtxt: null, // Not available in stats
    JPScalePCimg: null, // Not available in stats
    LeastReached: data.least_reached ? 'Y' : 'N',
    LeastReachedBasis: '', // Not available in stats
    Unengaged: null, // Not available in stats
    FrontierPeopleGroup: data.frontier ? 'Y' : 'N',
    MapID: '', // Not available in stats
    RaceCode: null, // Not available in stats
    RaceName: null, // Not available in stats
    AffinityBloc: data.affinity_bloc || '',
    PeopleCluster: data.people_cluster || '',
    PeopNameAcrossCountries: data.peop_name_across_countries || data.name || '',
    Population: data.population || 0,
    PopulationPercentUN: 0, // Not available in stats
    ROG2: '', // Not available in stats
    ROP3: '', // Not available in stats
    ROP2: '', // Not available in stats
    ROP25: '', // Not available in stats
    RegionCode: '', // Not available in stats
    RegionName: '', // Not available in stats
    ContinentCode: '', // Not available in stats
    ContinentName: '', // Not available in stats
    WindowStatus: '', // Not available in stats
    Longitude: 0, // Not available in stats
    Latitude: 0, // Not available in stats
    SecurityLevel: 0, // Not available in stats
    BibleStatus:
      data.bible_status || data.primary_language_bible_status || null,
    BibleYear: data.bible_year || null,
    NTYear: data.nt_year || null,
    PortionsYear: data.portions_year || null,
    TranslationNeedYear: null, // Not available in stats
    TranslationNeedQuestionable: null, // Not available in stats
    BibleTranslationNeed: '', // Not available in stats
    JF: data.has_jesus_film || data.jf ? 'Y' : 'N',
    HasJesusFilm: data.has_jesus_film || data.jf ? 'Y' : null,
    JFLang: '', // Not available in stats
    JFPrimaryText: '', // Not available in stats
    AudioScripture: '', // Not available in stats
    HasAudioRecordings: data.has_audio_recordings ? 'Y' : null,
    AudioRecordings: data.has_audio_recordings ? 'Y' : null,
    GRN: data.grn ? 'Y' : '',
    GRNLang: '', // Not available in stats
    FourLaws: '', // Not available in stats
    GodStory: '', // Not available in stats
    IndigenousLanguage: null, // Not available in stats
    SomeMediumLanguage: null, // Not available in stats
    PrimaryMediumLanguage: null, // Not available in stats
    GospelRadio: '', // Not available in stats
    ImageURL: data.image_url || null,
    PhotoAddress: null, // Not available in stats
    PhotoCredits: null, // Not available in stats
    ProfileTextExists: 0, // Not available in stats
    PeopleGroupURL: '', // Not available in stats
    PeopleGroupPhotoURL: '', // Not available in stats
    CountryURL: '', // Not available in stats
    JPScaleImageURL: null, // Not available in stats
    Summary: null, // Not available in stats
    Resources: null, // Not available in stats
    NTOnline: null, // Not available in stats
    NumberLanguagesSpoken: data.language_count || null,
    OfficialLang: null, // Not available in stats
    SpeakNationalLang: null, // Not available in stats
  };
}

/**
 * Fetches people groups from cache for a given region (country)
 * Supports pagination and sorting
 */
export function useJPPeopleGroupsByCountryCache(
  regionId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField?: string,
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;
  const sortColumn = sortField ? mapSortFieldToColumn(sortField) : null;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: [
      'jp-people-groups-country-cache',
      regionId,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: async () => {
      if (!regionId) {
        console.log(
          `[useJPPeopleGroupsByCountryCache] ⚠️ No regionId provided, returning empty array`
        );
        return [];
      }

      try {
        console.log(
          `[useJPPeopleGroupsByCountryCache] Attempting cache lookup for region: ${regionId} (page: ${page}, limit: ${limit})`
        );
        // Step 1: Query contextual view to get people_group_ids and contextual fields
        let contextualQuery = supabase
          .from('people_groups_regions_stats')
          .select(
            'people_group_id, population as contextual_population, name as contextual_name, language_count as contextual_language_count'
          )
          .eq('region_id', regionId);

        // Apply sorting on contextual fields if possible
        if (sortColumn && ['name', 'population'].includes(sortColumn)) {
          contextualQuery = contextualQuery.order(sortColumn, {
            ascending: sortDirection === 'asc',
          });
        }

        contextualQuery = contextualQuery.range(offset, offset + limit - 1);

        const { data: contextualData, error: contextualError } =
          await contextualQuery;

        if (contextualError) {
          throw contextualError;
        }

        if (!contextualData || contextualData.length === 0) {
          console.log(
            `[useJPPeopleGroupsByCountryCache] ⚠️ CACHE MISS for region: ${regionId} - No contextual data found`
          );
          // Fall through to API fallback
        } else {
          console.log(
            `[useJPPeopleGroupsByCountryCache] ✅ Contextual data found for region: ${regionId} - Found ${contextualData.length} people groups`
          );

          // Step 2: Query people_groups_stats for full stats
          const peopleGroupIds = contextualData.map(
            (row: any) => row.people_group_id
          );
          const { data: statsData, error: statsError } = await supabase
            .from('people_groups_stats')
            .select('*')
            .in('people_group_id', peopleGroupIds);

          if (statsError) {
            throw statsError;
          }

          // Step 3: Merge contextual data with full stats
          const statsMap = new Map(
            (statsData || []).map((stat: any) => [stat.people_group_id, stat])
          );

          const mergedData = contextualData.map((contextual: any) => {
            const stats = statsMap.get(contextual.people_group_id);
            return {
              ...stats, // Full stats from people_groups_stats
              // Override with contextual fields where available
              population: contextual.contextual_population ?? stats?.population,
              peop_name_in_country:
                contextual.contextual_name ?? stats?.peop_name_in_country,
              language_count:
                contextual.contextual_language_count ?? stats?.language_count,
            };
          });

          // Step 4: Apply client-side sorting if needed (for fields not in contextual view)
          let sortedData = mergedData;
          if (sortColumn && !['name', 'population'].includes(sortColumn)) {
            sortedData = [...mergedData].sort((a, b) => {
              const aVal = a[sortColumn];
              const bVal = b[sortColumn];
              if (aVal == null && bVal == null) return 0;
              if (aVal == null) return 1;
              if (bVal == null) return -1;
              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              return sortDirection === 'asc' ? comparison : -comparison;
            });
          }

          return sortedData.map(transformPeopleGroupFromCache);
        }

        // Fallback to API if cache miss
        if (fips) {
          console.log(
            `[useJPPeopleGroupsByCountryCache] ⚠️ CACHE MISS for region: ${regionId} - No data found, falling back to API (FIPS: ${fips})`
          );
          const apiData = await fetchPeopleGroupsByFIPS(
            fips,
            page,
            limit,
            sortField || 'Population',
            sortDirection
          );
          console.log(
            `[useJPPeopleGroupsByCountryCache] ${apiData && apiData.length > 0 ? '✅ API SUCCESS' : '❌ API RETURNED EMPTY'} for region: ${regionId} - Got ${apiData?.length || 0} people groups`
          );
          return apiData;
        }

        console.log(
          `[useJPPeopleGroupsByCountryCache] ❌ NO API FALLBACK - Missing FIPS for region: ${regionId}`,
          { externalIds, fips }
        );
        return [];
      } catch (error) {
        console.warn(
          `[useJPPeopleGroupsByCountryCache] ⚠️ CACHE ERROR for region ${regionId}, falling back to API:`,
          error
        );
        // Fallback to API
        if (fips) {
          try {
            console.log(
              `[useJPPeopleGroupsByCountryCache] 🔄 API FALLBACK (error recovery) for region: ${regionId} (FIPS: ${fips})`
            );
            const apiData = await fetchPeopleGroupsByFIPS(
              fips,
              page,
              limit,
              sortField || 'Population',
              sortDirection
            );
            console.log(
              `[useJPPeopleGroupsByCountryCache] ${apiData && apiData.length > 0 ? '✅ API SUCCESS (error recovery)' : '❌ API RETURNED EMPTY (error recovery)'} for region: ${regionId} - Got ${apiData?.length || 0} people groups`
            );
            return apiData;
          } catch (apiError) {
            console.error(
              `[useJPPeopleGroupsByCountryCache] ❌ API fallback also failed:`,
              apiError
            );
            return [];
          }
        }
        console.log(
          `[useJPPeopleGroupsByCountryCache] ❌ NO API FALLBACK (error recovery) - Missing FIPS for region: ${regionId}`
        );
        return [];
      }
    },
    enabled: !!regionId && !idsLoading,
    ...CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from cache for a given language entity
 * Supports pagination and sorting
 */
export function useJPPeopleGroupsByLanguageCache(
  languageEntityId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField?: string,
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;
  const sortColumn = sortField ? mapSortFieldToColumn(sortField) : null;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: [
      'jp-people-groups-language-cache',
      languageEntityId,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: async () => {
      if (!languageEntityId) {
        console.log(
          `[useJPPeopleGroupsByLanguageCache] ⚠️ No languageEntityId provided, returning empty array`
        );
        return [];
      }

      try {
        console.log(
          `[useJPPeopleGroupsByLanguageCache] Attempting cache lookup for language: ${languageEntityId} (page: ${page}, limit: ${limit})`
        );
        // Step 1: Query contextual view to get people_group_ids and contextual fields
        let contextualQuery = supabase
          .from('languages_people_groups_stats')
          .select(
            'people_group_id, population as contextual_population, region_count, is_primary'
          )
          .eq('language_entity_id', languageEntityId);

        // Apply sorting on contextual fields if possible
        if (sortColumn && sortColumn === 'population') {
          contextualQuery = contextualQuery.order('population', {
            ascending: sortDirection === 'asc',
          });
        }

        contextualQuery = contextualQuery.range(offset, offset + limit - 1);

        const { data: contextualData, error: contextualError } =
          await contextualQuery;

        if (contextualError) {
          throw contextualError;
        }

        if (!contextualData || contextualData.length === 0) {
          console.log(
            `[useJPPeopleGroupsByLanguageCache] ⚠️ CACHE MISS for language: ${languageEntityId} - No contextual data found`
          );
          // Fall through to API fallback
        } else {
          console.log(
            `[useJPPeopleGroupsByLanguageCache] ✅ Contextual data found for language: ${languageEntityId} - Found ${contextualData.length} people groups`
          );

          // Step 2: Query people_groups_stats for full stats
          const peopleGroupIds = contextualData.map(
            (row: any) => row.people_group_id
          );
          const { data: statsData, error: statsError } = await supabase
            .from('people_groups_stats')
            .select('*')
            .in('people_group_id', peopleGroupIds);

          if (statsError) {
            throw statsError;
          }

          // Step 3: Merge contextual data with full stats
          const statsMap = new Map(
            (statsData || []).map((stat: any) => [stat.people_group_id, stat])
          );

          const mergedData = contextualData.map((contextual: any) => {
            const stats = statsMap.get(contextual.people_group_id);
            return {
              ...stats, // Full stats from people_groups_stats
              // Override with contextual fields where available
              population: contextual.contextual_population ?? stats?.population,
            };
          });

          // Step 4: Apply client-side sorting if needed (for fields not in contextual view)
          let sortedData = mergedData;
          if (sortColumn && sortColumn !== 'population') {
            sortedData = [...mergedData].sort((a, b) => {
              const aVal = a[sortColumn];
              const bVal = b[sortColumn];
              if (aVal == null && bVal == null) return 0;
              if (aVal == null) return 1;
              if (bVal == null) return -1;
              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              return sortDirection === 'asc' ? comparison : -comparison;
            });
          }

          return sortedData.map(transformPeopleGroupFromCache);
        }

        // Fallback to API if cache miss
        if (rol3) {
          console.log(
            `[useJPPeopleGroupsByLanguageCache] ⚠️ CACHE MISS for language: ${languageEntityId} - No data found, falling back to API (ROL3: ${rol3})`
          );
          const apiData = await fetchPeopleGroupsByLanguage(
            rol3,
            page,
            limit,
            sortField || 'Population',
            sortDirection
          );
          console.log(
            `[useJPPeopleGroupsByLanguageCache] ${apiData && apiData.length > 0 ? '✅ API SUCCESS' : '❌ API RETURNED EMPTY'} for language: ${languageEntityId} - Got ${apiData?.length || 0} people groups`
          );
          return apiData;
        }

        console.log(
          `[useJPPeopleGroupsByLanguageCache] ❌ NO API FALLBACK - Missing ROL3 for language: ${languageEntityId}`,
          { externalIds, rol3 }
        );
        return [];
      } catch (error) {
        console.warn(
          `[useJPPeopleGroupsByLanguageCache] ⚠️ CACHE ERROR for language ${languageEntityId}, falling back to API:`,
          error
        );
        // Fallback to API
        if (rol3) {
          try {
            console.log(
              `[useJPPeopleGroupsByLanguageCache] 🔄 API FALLBACK (error recovery) for language: ${languageEntityId} (ROL3: ${rol3})`
            );
            const apiData = await fetchPeopleGroupsByLanguage(
              rol3,
              page,
              limit,
              sortField || 'Population',
              sortDirection
            );
            console.log(
              `[useJPPeopleGroupsByLanguageCache] ${apiData && apiData.length > 0 ? '✅ API SUCCESS (error recovery)' : '❌ API RETURNED EMPTY (error recovery)'} for language: ${languageEntityId} - Got ${apiData?.length || 0} people groups`
            );
            return apiData;
          } catch (apiError) {
            console.error(
              `[useJPPeopleGroupsByLanguageCache] ❌ API fallback also failed:`,
              apiError
            );
            return [];
          }
        }
        console.log(
          `[useJPPeopleGroupsByLanguageCache] ❌ NO API FALLBACK (error recovery) - Missing ROL3 for language: ${languageEntityId}`
        );
        return [];
      }
    },
    enabled: !!languageEntityId && !idsLoading,
    ...CACHE_CONFIG,
  });
}

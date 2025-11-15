/**
 * React Query hooks for Joshua Project API data
 *
 * These hooks fetch data from the Joshua Project API through our Next.js proxy,
 * with proper caching and error handling.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';
import {
  type JPCountry,
  type JPLanguage,
  type JPPeopleGroup,
  type ExternalIdSource,
  fetchCountryStatsByFIPS,
  fetchLanguageStats,
  fetchPeopleGroupsByCountry,
  fetchPeopleGroupsByLanguage,
  extractISO3FromRegionSources,
  extractFIPSFromRegionSources,
  extractISO6393FromLanguageSources,
  fetchFromProxy,
} from '../services/joshuaProjectApi';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const JP_CACHE_CONFIG = {
  staleTime: 24 * 60 * 60 * 1000, // 24 hours
  gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days (replaces cacheTime in v5)
  retry: 1, // Only retry once on failure
  refetchOnWindowFocus: false, // Don't refetch on window focus
  refetchOnMount: true, // Always refetch on mount to ensure fresh data
} as const;

// ============================================================================
// EXTERNAL ID LOOKUP HOOKS
// ============================================================================

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

// ============================================================================
// JOSHUA PROJECT DATA HOOKS
// ============================================================================

/**
 * Fetches country statistics from Joshua Project for a given region
 *
 * Uses FIPS code from database (region_sources) for optimal performance.
 * Falls back to ISO3 if FIPS code is not available.
 */
export function useJPCountryStats(
  regionId: string | null
): UseQueryResult<JPCountry | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null; // Fallback

  // Debug logging
  if (process.env.NODE_ENV === 'development' && regionId) {
    console.log('[JP Debug] Region ID:', regionId);
    console.log('[JP Debug] External IDs found:', externalIds);
    console.log('[JP Debug] Extracted FIPS:', fips);
    console.log('[JP Debug] Extracted ISO3 (fallback):', iso3);
  }

  return useQuery({
    queryKey: ['jp-country-stats', regionId, fips || iso3], // Include regionId to prevent cross-region caching
    queryFn: async () => {
      // Prefer FIPS code from database (more efficient)
      if (fips) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[JP Debug] Fetching country stats by FIPS code:', fips);
        }
        const result = await fetchCountryStatsByFIPS(fips);
        if (process.env.NODE_ENV === 'development' && result) {
          console.log('[JP Debug] Country stats fetched:', {
            Ctry: result.Ctry,
            ISO3: result.ISO3,
            ROG3: result.ROG3,
          });
        }
        return result;
      }

      // Fallback to ISO3 if FIPS not available (shouldn't happen after seed is run)
      if (iso3) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[JP Debug] FIPS code not found, falling back to ISO3:',
            iso3
          );
        }
        // Import fetchCountryStats for fallback
        const { fetchCountryStats } = await import(
          '../services/joshuaProjectApi'
        );
        return await fetchCountryStats(iso3);
      }

      return null;
    },
    enabled: !!(fips || iso3) && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches language statistics from Joshua Project for a given language entity
 */
export function useJPLanguageStats(
  languageEntityId: string | null
): UseQueryResult<JPLanguage | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;

  return useQuery({
    queryKey: ['jp-language-stats', iso6393],
    queryFn: () => fetchLanguageStats(iso6393!),
    enabled: !!iso6393 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given region
 *
 * Uses the `countries` parameter with FIPS code (ROG3) for efficient filtering.
 * The hook fetches country stats first to get the ROG3 code, then uses it to filter people groups.
 */
export function useJPPeopleGroupsByCountry(
  regionId: string | null,
  limit: number = 100
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null;

  // Fetch country stats to get ROG3 code (FIPS) for filtering
  const countryStatsQuery = useJPCountryStats(regionId);
  const rog3 = countryStatsQuery.data?.ROG3;

  return useQuery({
    queryKey: ['jp-people-groups-country', regionId, iso3, rog3, limit], // Include regionId to prevent cross-region caching
    queryFn: () => {
      if (!iso3 || !rog3) {
        return Promise.resolve([]);
      }
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[JP Debug] Fetching people groups for ISO3: ${iso3} using FIPS code: ${rog3}`
        );
      }
      return fetchPeopleGroupsByCountry(iso3, limit);
    },
    enabled: !!iso3 && !!rog3 && !idsLoading && !countryStatsQuery.isLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given language entity
 */
export function useJPPeopleGroupsByLanguage(
  languageEntityId: string | null,
  limit: number = 100
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;

  return useQuery({
    queryKey: ['jp-people-groups-language', iso6393, limit],
    queryFn: () => fetchPeopleGroupsByLanguage(iso6393!, limit),
    enabled: !!iso6393 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

// ============================================================================
// COMBINED DATA HOOKS
// ============================================================================

/**
 * Fetches all Joshua Project data for a region (country stats + people groups)
 */
export function useJPCountryData(regionId: string | null) {
  const countryStats = useJPCountryStats(regionId);
  const peopleGroups = useJPPeopleGroupsByCountry(regionId);

  // Debug logging
  if (process.env.NODE_ENV === 'development' && regionId && countryStats.data) {
    console.log('[JP Debug] useJPCountryData - Country stats:', {
      Ctry: countryStats.data.Ctry,
      ISO3: countryStats.data.ISO3,
      ROG3: countryStats.data.ROG3,
    });
  }

  return {
    countryStats: countryStats.data,
    peopleGroups: peopleGroups.data || [],
    isLoading: countryStats.isLoading || peopleGroups.isLoading,
    error: countryStats.error || peopleGroups.error,
    hasData: !!(countryStats.data || peopleGroups.data?.length),
  };
}

/**
 * Fetches all Joshua Project data for a language entity (language stats + people groups)
 */
export function useJPLanguageData(languageEntityId: string | null) {
  const languageStats = useJPLanguageStats(languageEntityId);
  const peopleGroups = useJPPeopleGroupsByLanguage(languageEntityId);

  return {
    languageStats: languageStats.data,
    peopleGroups: peopleGroups.data || [],
    isLoading: languageStats.isLoading || peopleGroups.isLoading,
    error: languageStats.error || peopleGroups.error,
    hasData: !!(languageStats.data || peopleGroups.data?.length),
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Check if Joshua Project data is available for a region
 */
export function useHasJPCountryData(regionId: string | null): boolean {
  const { data: externalIds } = useRegionExternalIds(regionId);
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null;
  return !!iso3;
}

/**
 * Check if Joshua Project data is available for a language entity
 */
export function useHasJPLanguageData(languageEntityId: string | null): boolean {
  const { data: externalIds } = useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;
  return !!iso6393;
}

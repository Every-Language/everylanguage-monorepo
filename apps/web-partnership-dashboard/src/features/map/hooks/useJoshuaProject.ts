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
  fetchPeopleGroupsByLanguage,
  fetchPeopleGroupsByFIPS,
  extractISO3FromRegionSources,
  extractFIPSFromRegionSources,
  extractROL3FromLanguageSources,
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

  return useQuery({
    queryKey: ['jp-country-stats', regionId, fips || iso3], // Include regionId to prevent cross-region caching
    queryFn: async () => {
      // Prefer FIPS code from database (more efficient)
      if (fips) {
        const result = await fetchCountryStatsByFIPS(fips);
        return result;
      }

      // Fallback to ISO3 if FIPS not available (shouldn't happen after seed is run)
      if (iso3) {
        // Import fetchCountryStats for fallback
        const { fetchCountryStats } =
          await import('../services/joshuaProjectApi');
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
 * Uses ROL3 codes (Joshua Project language codes) which often match ISO 639-3
 */
export function useJPLanguageStats(
  languageEntityId: string | null
): UseQueryResult<JPLanguage | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-language-stats', rol3],
    queryFn: () => fetchLanguageStats(rol3!),
    enabled: !!rol3 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given region
 *
 * Uses FIPS code directly from database (region_sources) for efficient filtering.
 * This is the preferred method as it doesn't require fetching country stats first.
 */
export function useJPPeopleGroupsByCountry(
  regionId: string | null,
  limit: number = 100
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-people-groups-country', regionId, fips, limit], // Include regionId to prevent cross-region caching
    queryFn: () => {
      if (!fips) {
        return Promise.resolve([]);
      }
      return fetchPeopleGroupsByFIPS(fips, 1, limit, 'Population', 'desc');
    },
    enabled: !!fips && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given region with pagination
 *
 * Uses FIPS code directly from database (region_sources) for efficient filtering.
 * Supports pagination and sorting.
 */
export function useJPPeopleGroupsByCountryPaginated(
  regionId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField: string = 'Population',
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useRegionExternalIds(regionId);
  const fips = externalIds ? extractFIPSFromRegionSources(externalIds) : null;

  return useQuery({
    queryKey: [
      'jp-people-groups-country-paginated',
      regionId,
      fips,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: () => {
      if (!fips) {
        return Promise.resolve([]);
      }
      return fetchPeopleGroupsByFIPS(
        fips,
        page,
        limit,
        sortField,
        sortDirection
      );
    },
    enabled: !!fips && !idsLoading,
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
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-people-groups-language', rol3, limit],
    queryFn: () =>
      fetchPeopleGroupsByLanguage(rol3!, 1, limit, 'Population', 'desc'),
    enabled: !!rol3 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given language entity with pagination
 *
 * Supports pagination and sorting.
 */
export function useJPPeopleGroupsByLanguagePaginated(
  languageEntityId: string | null,
  page: number = 1,
  limit: number = 20,
  sortField: string = 'Population',
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;

  return useQuery({
    queryKey: [
      'jp-people-groups-language-paginated',
      rol3,
      page,
      limit,
      sortField,
      sortDirection,
    ],
    queryFn: () => {
      if (!rol3) {
        return Promise.resolve([]);
      }
      return fetchPeopleGroupsByLanguage(
        rol3,
        page,
        limit,
        sortField,
        sortDirection
      );
    },
    enabled: !!rol3 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

// ============================================================================
// COMBINED DATA HOOKS
// ============================================================================

/**
 * Fetches all Joshua Project data for a region (country stats + people groups)
 * Uses paginated hook with larger page size for initial data fetch
 */
export function useJPCountryData(regionId: string | null) {
  const countryStats = useJPCountryStats(regionId);
  // Use paginated hook with page 1, limit 100 for initial data
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

/**
 * Fetches all Joshua Project data for a language entity (language stats + people groups)
 * Uses paginated hook with larger page size for initial data fetch and population calculation
 */
export function useJPLanguageData(languageEntityId: string | null) {
  const languageStats = useJPLanguageStats(languageEntityId);
  // Use paginated hook with page 1, limit 100 for initial data and population calculation
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
 * Uses ROL3 codes (Joshua Project language codes)
 */
export function useHasJPLanguageData(languageEntityId: string | null): boolean {
  const { data: externalIds } = useLanguageExternalIds(languageEntityId);
  const rol3 = externalIds ? extractROL3FromLanguageSources(externalIds) : null;
  return !!rol3;
}

/**
 * Fetches language cache data from jp_language_cache table by ISO639-3 code
 */
export function useJPLanguageCache(iso6393: string | null): UseQueryResult<{
  bible_status: number | null;
  bible_year: string | null;
  nt_year: string | null;
  portions_year: string | null;
  has_audio_recordings: boolean;
  language_name: string;
} | null> {
  return useQuery({
    queryKey: ['jp-language-cache', iso6393],
    queryFn: async () => {
      if (!iso6393) return null;

      const { data, error } = await supabase
        .from('jp_language_cache')
        .select(
          'bible_status, bible_year, nt_year, portions_year, has_audio_recordings, language_name'
        )
        .eq('iso639_3', iso6393)
        .single();

      if (error) {
        // Not found is okay, just return null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!iso6393,
    staleTime: 60 * 60 * 1000, // 1 hour - cache data doesn't change frequently
  });
}

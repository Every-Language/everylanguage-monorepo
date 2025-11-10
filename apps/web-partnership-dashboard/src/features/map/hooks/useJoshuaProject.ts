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
  fetchCountryStats,
  fetchLanguageStats,
  fetchPeopleGroupsByCountry,
  fetchPeopleGroupsByLanguage,
  extractISO3FromRegionSources,
  extractISO6393FromLanguageSources,
} from '../services/joshuaProjectApi';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const JP_CACHE_CONFIG = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes (replaces cacheTime in v5)
  retry: 1, // Only retry once on failure
  refetchOnWindowFocus: false, // Don't refetch on window focus
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
        .eq('is_external', true);
      
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
        .eq('is_external', true);
      
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
 */
export function useJPCountryStats(regionId: string | null): UseQueryResult<JPCountry | null> {
  const { data: externalIds, isLoading: idsLoading } = useRegionExternalIds(regionId);
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-country-stats', iso3],
    queryFn: () => fetchCountryStats(iso3!),
    enabled: !!iso3 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches language statistics from Joshua Project for a given language entity
 */
export function useJPLanguageStats(languageEntityId: string | null): UseQueryResult<JPLanguage | null> {
  const { data: externalIds, isLoading: idsLoading } = useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds ? extractISO6393FromLanguageSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-language-stats', iso6393],
    queryFn: () => fetchLanguageStats(iso6393!),
    enabled: !!iso6393 && !idsLoading,
    ...JP_CACHE_CONFIG,
  });
}

/**
 * Fetches people groups from Joshua Project for a given region
 */
export function useJPPeopleGroupsByCountry(
  regionId: string | null,
  limit: number = 100
): UseQueryResult<JPPeopleGroup[]> {
  const { data: externalIds, isLoading: idsLoading } = useRegionExternalIds(regionId);
  const iso3 = externalIds ? extractISO3FromRegionSources(externalIds) : null;

  return useQuery({
    queryKey: ['jp-people-groups-country', iso3, limit],
    queryFn: () => fetchPeopleGroupsByCountry(iso3!, limit),
    enabled: !!iso3 && !idsLoading,
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
  const { data: externalIds, isLoading: idsLoading } = useLanguageExternalIds(languageEntityId);
  const iso6393 = externalIds ? extractISO6393FromLanguageSources(externalIds) : null;

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
  const iso6393 = externalIds ? extractISO6393FromLanguageSources(externalIds) : null;
  return !!iso6393;
}



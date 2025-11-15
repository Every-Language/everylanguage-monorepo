/**
 * React Query hooks for GRN API data
 *
 * These hooks fetch data from the GRN API through our Next.js proxy,
 * with proper caching and error handling.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/shared/services/supabase';
import {
  type GRNLanguageFeed,
  type GRNSetFeed,
  type GRNISOFeed,
  type ExternalIdSource,
  fetchLanguageFeed,
  fetchSetFeed,
  fetchISOFeed,
  getTrackUrl,
  extractROLVFromLanguageSources,
  extractISO6393FromLanguageSources,
} from '../services/grnApi';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const GRN_CACHE_CONFIG = {
  staleTime: 24 * 60 * 60 * 1000, // 24 hours - GRN data is static
  gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days (replaces cacheTime in v5)
  retry: 1, // Only retry once on failure
  refetchOnWindowFocus: false, // Don't refetch on window focus
} as const;

// ============================================================================
// EXTERNAL ID LOOKUP HOOKS
// ============================================================================

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

// ============================================================================
// GRN DATA HOOKS
// ============================================================================

/**
 * Fetches language feed from GRN for a given language entity
 * Supports both direct GRN Language Number/ROLV code and ISO code lookup
 */
export function useGRNLanguageFeed(
  languageEntityId: string | null
): UseQueryResult<GRNLanguageFeed | null> {
  const { data: externalIds, isLoading: idsLoading } =
    useLanguageExternalIds(languageEntityId);
  const grnId = externalIds
    ? extractROLVFromLanguageSources(externalIds)
    : null;
  const isoCode = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;

  // First, try to fetch ISO feed to get GRN Language Number if we only have ISO code
  const { data: isoFeed, isLoading: isoLoading } = useQuery({
    queryKey: ['grn-iso-feed', isoCode],
    queryFn: () => fetchISOFeed(isoCode!),
    enabled: !!isoCode && !grnId && !idsLoading,
    ...GRN_CACHE_CONFIG,
  });

  // Get the GRN Language Number from ISO feed (use first one)
  const grnLanguageNumber =
    grnId || isoFeed?.grnIds?.pair?.[0]?.id?.toString() || null;

  // Debug logging
  React.useEffect(() => {
    if (languageEntityId) {
      console.log('[useGRN] Language Entity ID:', languageEntityId);
      console.log('[useGRN] External IDs:', externalIds);
      console.log(
        '[useGRN] External IDs (expanded):',
        JSON.stringify(externalIds, null, 2)
      );
      console.log('[useGRN] GRN ID (direct):', grnId);
      console.log('[useGRN] ISO Code:', isoCode);
      console.log('[useGRN] ISO Feed:', isoFeed);
      console.log('[useGRN] GRN Language Number (final):', grnLanguageNumber);
      console.log('[useGRN] IDs Loading:', idsLoading);
      console.log('[useGRN] ISO Loading:', isoLoading);
    }
  }, [
    languageEntityId,
    externalIds,
    grnId,
    isoCode,
    isoFeed,
    grnLanguageNumber,
    idsLoading,
    isoLoading,
  ]);

  return useQuery({
    queryKey: ['grn-language-feed', grnLanguageNumber],
    queryFn: () => fetchLanguageFeed(grnLanguageNumber!),
    enabled: !!grnLanguageNumber && !idsLoading && !isoLoading,
    ...GRN_CACHE_CONFIG,
  });
}

/**
 * Fetches set/program feed from GRN by set ID
 */
export function useGRNSetFeed(
  setId: string | number | null
): UseQueryResult<GRNSetFeed | null> {
  return useQuery({
    queryKey: ['grn-set-feed', setId],
    queryFn: () => fetchSetFeed(setId!),
    enabled: !!setId,
    ...GRN_CACHE_CONFIG,
  });
}

/**
 * Gets track audio URL (synchronous - just builds URL)
 */
export function useGRNTrackUrl(
  setId: string | number | null,
  trackId: string | number | null
): string | null {
  if (!setId || !trackId) return null;
  return getTrackUrl(setId, trackId);
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Check if GRN data is available for a language entity
 * Returns true if we have either a GRN ID or an ISO code
 */
export function useHasGRNData(languageEntityId: string | null): boolean {
  const { data: externalIds } = useLanguageExternalIds(languageEntityId);
  const grnId = externalIds
    ? extractROLVFromLanguageSources(externalIds)
    : null;
  const isoCode = externalIds
    ? extractISO6393FromLanguageSources(externalIds)
    : null;
  return !!(grnId || isoCode);
}

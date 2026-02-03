import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/infrastructure/supabase';
import { logger } from '@/shared/utils/logger';
import { useNetworkConnectivity } from '@/shared/hooks';
import {
  createNetworkError,
  isNetworkError,
} from '@/shared/utils/networkErrors';
import type { Database } from '@everylanguage/shared-types';

export interface LanguageSearchResult {
  entity_id: string;
  entity_name: string;
  entity_level: string;
  entity_parent_id: string | null;
  alias_id: string;
  alias_name: string;
  alias_similarity_score: number;
  regions: Array<{
    region_id: string;
    region_name: string;
    region_level: string;
  }> | null;
}

type NormalizedRegion = NonNullable<LanguageSearchResult['regions']>[number];

interface UseSearchLanguagesResult {
  data: LanguageSearchResult[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const normalizeRegions = (
  regionsValue: unknown
): LanguageSearchResult['regions'] => {
  if (!Array.isArray(regionsValue)) {
    return null;
  }

  const normalized = regionsValue
    .map((item: unknown): NormalizedRegion | null => {
      if (item === null || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const regionId =
        typeof record['region_id'] === 'string' ? record['region_id'] : null;
      const regionName =
        typeof record['region_name'] === 'string'
          ? record['region_name']
          : null;
      const regionLevel =
        typeof record['region_level'] === 'string'
          ? record['region_level']
          : null;

      if (!regionId || !regionName || !regionLevel) {
        return null;
      }

      return {
        region_id: regionId,
        region_name: regionName,
        region_level: regionLevel,
      };
    })
    .filter((region): region is NormalizedRegion => region !== null);

  return normalized.length > 0 ? normalized : null;
};

/**
 * Hook for searching languages using fuzzy search
 *
 * Uses Supabase RPC function search_language_aliases to find languages
 * matching the search query. Returns results sorted by similarity score.
 */
export const useSearchLanguages = (
  searchQuery: string,
  enabled: boolean = true
): UseSearchLanguagesResult => {
  const [data, setData] = useState<LanguageSearchResult[] | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isNetworkAvailable, isInitialized } = useNetworkConnectivity();

  const search = useCallback(async (): Promise<void> => {
    if (!enabled || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check network connectivity before making request
    if (isInitialized && !isNetworkAvailable()) {
      const networkError = createNetworkError(
        new Error('No network connection'),
        'No internet connection. Please check your network settings.'
      );
      setError(networkError);
      setIsLoading(false);
      setData(undefined);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: searchError } = await supabase.rpc(
        'search_language_aliases',
        {
          search_query: searchQuery.trim(),
          max_results: 30,
          min_similarity: 0.1,
          include_regions: true,
        }
      );

      if (searchError) {
        logger.error('Error searching languages:', searchError);
        throw searchError;
      }

      if (!result || result.length === 0) {
        setData([]);
      } else {
        // Transform the results to match our interface
        type SearchResult =
          Database['public']['Functions']['search_language_aliases']['Returns'][number];
        const transformed = result.map((row: SearchResult) => ({
          entity_id: row.entity_id,
          entity_name: row.entity_name,
          entity_level: row.entity_level,
          entity_parent_id: row.entity_parent_id,
          alias_id: row.alias_id,
          alias_name: row.alias_name,
          alias_similarity_score: row.alias_similarity_score,
          regions: normalizeRegions(row.regions),
        }));
        setData(transformed);
      }
    } catch (err) {
      // Check if this is a network error
      if (isNetworkError(err)) {
        const networkError = createNetworkError(
          err,
          'Network error occurred while searching languages'
        );
        logger.error('Network error searching languages:', networkError);
        setError(networkError);
      } else {
        const error =
          err instanceof Error ? err : new Error('Failed to search languages');
        logger.error('Failed to search languages:', error);
        setError(error);
      }
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, enabled, isNetworkAvailable, isInitialized]);

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      void search();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [search]);

  return {
    data,
    isLoading,
    error,
    refetch: search,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/infrastructure/supabase';
import { logger } from '@/shared/utils/logger';
import { useNetworkConnectivity } from '@/shared/hooks';
import {
  createNetworkError,
  isNetworkError,
} from '@/shared/utils/networkErrors';
import type { Database } from '@everylanguage/shared-types';

export interface RegionSearchResult {
  region_id: string;
  region_name: string;
  region_level: string;
  region_parent_id: string | null;
  alias_id: string;
  alias_name: string;
  alias_similarity_score: number;
  languages: Array<{
    language_entity_id: string;
    language_name: string;
    language_level: string;
  }> | null;
}

interface UseSearchRegionsResult {
  data: RegionSearchResult[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for searching regions using fuzzy search
 *
 * Uses Supabase RPC function search_region_aliases to find regions
 * matching the search query. Returns results sorted by similarity score.
 */
export const useSearchRegions = (
  searchQuery: string,
  enabled: boolean = true
): UseSearchRegionsResult => {
  const [data, setData] = useState<RegionSearchResult[] | undefined>(undefined);
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
        'search_region_aliases',
        {
          search_query: searchQuery.trim(),
          max_results: 30,
          min_similarity: 0.1,
          include_languages: false,
        }
      );

      if (searchError) {
        logger.error('Error searching regions:', searchError);
        throw searchError;
      }

      if (!result || result.length === 0) {
        setData([]);
      } else {
        // Transform the results to match our interface
        type SearchResult =
          Database['public']['Functions']['search_region_aliases']['Returns'][number];
        const transformed = result.map((row: SearchResult) => ({
          region_id: row.region_id,
          region_name: row.region_name,
          region_level: row.region_level,
          region_parent_id: row.region_parent_id,
          alias_id: row.alias_id,
          alias_name: row.alias_name,
          alias_similarity_score: row.alias_similarity_score,
          languages: null,
        }));
        setData(transformed);
      }
    } catch (err) {
      // Check if this is a network error
      if (isNetworkError(err)) {
        const networkError = createNetworkError(
          err,
          'Network error occurred while searching regions'
        );
        logger.error('Network error searching regions:', networkError);
        setError(networkError);
      } else {
        const error =
          err instanceof Error ? err : new Error('Failed to search regions');
        logger.error('Failed to search regions:', error);
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

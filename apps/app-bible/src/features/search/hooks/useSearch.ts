import { useState, useCallback, useRef } from 'react';
import type { SearchResult, SearchFilters } from '../types';
import { searchService } from '../services';
import { useVersionsStore } from '@/features/languages/store/versionsStore';
import { logger } from '@/shared/utils/logger';

// Logging configuration
const ENABLE_LOGGING = false;

interface UseSearchOptions {
  debounceMs?: number;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const { debounceMs = 300 } = options;
  const { currentTextVersion } = useVersionsStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ type: 'all' });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (!currentTextVersion) {
        setError(
          'No text version selected. Please select a Bible version first.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        logger.debug(ENABLE_LOGGING, 'useSearch.performSearch', {
          query: searchQuery,
          textVersionId: currentTextVersion.id,
          filters: searchFilters,
        });

        // Perform searches in parallel based on filter type
        const [verseResults, bookResults, chapterResults] = await Promise.all([
          searchFilters.type !== 'books'
            ? searchService.searchVerses(searchQuery, currentTextVersion.id)
            : [],
          searchFilters.type !== 'verses'
            ? searchService.searchBooks(searchQuery)
            : [],
          searchFilters.type !== 'verses'
            ? searchService.searchChapters(searchQuery)
            : [],
        ]);

        // Combine all results
        const allResults = [...verseResults, ...bookResults, ...chapterResults];

        // Filter results based on current filters
        const filteredResults =
          searchFilters.type === 'all'
            ? allResults
            : allResults.filter(result => {
                switch (searchFilters.type) {
                  case 'books':
                    return result.type === 'book';
                  case 'chapters':
                    return result.type === 'chapter';
                  case 'verses':
                    return result.type === 'verse';
                  default:
                    return true;
                }
              });

        logger.debug(ENABLE_LOGGING, 'useSearch.performSearch completed', {
          totalResults: allResults.length,
          filteredResults: filteredResults.length,
          verseResults: verseResults.length,
          bookResults: bookResults.length,
          chapterResults: chapterResults.length,
        });

        setResults(filteredResults);
      } catch (err) {
        logger.error(ENABLE_LOGGING, 'useSearch.performSearch failed', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [currentTextVersion]
  );

  const search = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery, filters);
      }, debounceMs);
    },
    [performSearch, filters, debounceMs]
  );

  const updateFilters = useCallback(
    (newFilters: SearchFilters) => {
      setFilters(newFilters);

      // Re-search with new filters if we have a query
      if (query.trim()) {
        performSearch(query, newFilters);
      }
    },
    [query, performSearch]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  return {
    query,
    results,
    loading,
    error,
    filters,
    search,
    updateFilters,
    clearSearch,
  };
};

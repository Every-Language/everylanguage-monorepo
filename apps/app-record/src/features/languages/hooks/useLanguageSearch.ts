import { useState, useCallback, useEffect } from 'react';
import {
  LanguageSearchResult,
  fuzzySearchService,
} from '../services/fuzzySearchService';
import { languageSearchService } from '../services/languageSearchService';

export interface UseLanguageSearchReturn {
  // State
  isSearching: boolean;
  availableResults: LanguageSearchResult[];
  unavailableResults: LanguageSearchResult[];
  error: string | null;
  isLoadingPopular: boolean;
  popularResults: LanguageSearchResult[];

  // Actions
  searchAudioVersions: (query: string) => () => void;
  searchTextVersions: (query: string) => () => void;
  searchLanguages: (query: string) => () => void;
  fetchPopularVersions: (versionType: 'audio' | 'text') => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

/**
 * Hook for debounced language search with proper cleanup
 */
export const useLanguageSearch = (): UseLanguageSearchReturn => {
  const [isSearching, setIsSearching] = useState(false);
  const [availableResults, setAvailableResults] = useState<
    LanguageSearchResult[]
  >([]);
  const [unavailableResults, setUnavailableResults] = useState<
    LanguageSearchResult[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [popularResults, setPopularResults] = useState<LanguageSearchResult[]>(
    []
  );

  // Search for audio versions
  const searchAudioVersions = useCallback((query: string): (() => void) => {
    return languageSearchService.searchAudioVersions(
      query,
      results => {
        setAvailableResults(results.available);
        setUnavailableResults(results.unavailable);
        setError(null);
      },
      errorMessage => {
        setError(errorMessage);
        setAvailableResults([]);
        setUnavailableResults([]);
      },
      setIsSearching
    );
  }, []);

  // Search for text versions
  const searchTextVersions = useCallback((query: string): (() => void) => {
    return languageSearchService.searchTextVersions(
      query,
      results => {
        setAvailableResults(results.available);
        setUnavailableResults(results.unavailable);
        setError(null);
      },
      errorMessage => {
        setError(errorMessage);
        setAvailableResults([]);
        setUnavailableResults([]);
      },
      setIsSearching
    );
  }, []);

  // Search for languages (both audio and text)
  const searchLanguages = useCallback((query: string): (() => void) => {
    return languageSearchService.searchLanguages(
      query,
      results => {
        setAvailableResults(results.available);
        setUnavailableResults(results.unavailable);
        setError(null);
      },
      errorMessage => {
        setError(errorMessage);
        setAvailableResults([]);
        setUnavailableResults([]);
      },
      setIsSearching
    );
  }, []);

  // Fetch popular versions
  const fetchPopularVersions = useCallback(
    async (versionType: 'audio' | 'text') => {
      try {
        setIsLoadingPopular(true);
        setError(null);

        const filterType = versionType === 'audio' ? 'audio_only' : 'text_only';
        const results = await fuzzySearchService.getPopularVersions(
          filterType,
          { maxResults: 5 }
        );

        setPopularResults(results);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to fetch popular versions'
        );
      } finally {
        setIsLoadingPopular(false);
      }
    },
    []
  );

  // Clear search results
  const clearResults = useCallback(() => {
    setAvailableResults([]);
    setUnavailableResults([]);
    setError(null);
    setIsSearching(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      languageSearchService.clearAll();
    };
  }, []);

  return {
    // State
    isSearching,
    availableResults,
    unavailableResults,
    error,
    isLoadingPopular,
    popularResults,

    // Actions
    searchAudioVersions,
    searchTextVersions,
    searchLanguages,
    fetchPopularVersions,
    clearResults,
    clearError,
  };
};

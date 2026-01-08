import { logger } from '../../../shared/utils/logger';
import {
  LanguageSearchResult,
  FuzzySearchOptions,
  LanguageSearchWithVersionsOptions,
  fuzzySearchService,
} from './fuzzySearchService';

// Logging configuration for this module
const ENABLE_LOGGING = true;

/**
 * Enhanced language search service with debouncing and optimizations
 * for slow phones and intermittent networks
 */
export class LanguageSearchService {
  private static instance: LanguageSearchService;
  private searchTimeouts: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private lastSearchResults: Map<string, LanguageSearchResult[]> = new Map();
  private readonly DEFAULT_DEBOUNCE_MS = 500; // Reduced from 300ms for better mobile performance
  private readonly MIN_QUERY_LENGTH = 2;

  static getInstance(): LanguageSearchService {
    if (!LanguageSearchService.instance) {
      LanguageSearchService.instance = new LanguageSearchService();
    }
    return LanguageSearchService.instance;
  }

  /**
   * Search for languages with audio versions with debouncing
   */
  searchAudioVersions(
    query: string,
    onResult: (results: {
      available: LanguageSearchResult[];
      unavailable: LanguageSearchResult[];
    }) => void,
    onError: (error: string) => void,
    onLoading: (isLoading: boolean) => void,
    options: FuzzySearchOptions = {},
    debounceMs: number = this.DEFAULT_DEBOUNCE_MS
  ): () => void {
    return this.debouncedSearch(
      'audio',
      query,
      onResult,
      onError,
      onLoading,
      options,
      debounceMs
    );
  }

  /**
   * Search for languages with text versions with debouncing
   */
  searchTextVersions(
    query: string,
    onResult: (results: {
      available: LanguageSearchResult[];
      unavailable: LanguageSearchResult[];
    }) => void,
    onError: (error: string) => void,
    onLoading: (isLoading: boolean) => void,
    options: FuzzySearchOptions = {},
    debounceMs: number = this.DEFAULT_DEBOUNCE_MS
  ): () => void {
    return this.debouncedSearch(
      'text',
      query,
      onResult,
      onError,
      onLoading,
      options,
      debounceMs
    );
  }

  /**
   * Search for languages (both audio and text) with debouncing
   */
  searchLanguages(
    query: string,
    onResult: (results: {
      available: LanguageSearchResult[];
      unavailable: LanguageSearchResult[];
    }) => void,
    onError: (error: string) => void,
    onLoading: (isLoading: boolean) => void,
    options: LanguageSearchWithVersionsOptions = {},
    debounceMs: number = this.DEFAULT_DEBOUNCE_MS
  ): () => void {
    return this.debouncedSearch(
      'both',
      query,
      onResult,
      onError,
      onLoading,
      options,
      debounceMs
    );
  }

  /**
   * Core debounced search implementation
   */
  private debouncedSearch(
    searchType: 'audio' | 'text' | 'both',
    query: string,
    onResult: (results: {
      available: LanguageSearchResult[];
      unavailable: LanguageSearchResult[];
    }) => void,
    onError: (error: string) => void,
    onLoading: (isLoading: boolean) => void,
    options: FuzzySearchOptions | LanguageSearchWithVersionsOptions = {},
    debounceMs: number
  ): () => void {
    const searchKey = `${searchType}-${query}`;

    // Clear any existing timeout for this search type
    this.clearTimeout(searchType);

    // If query is too short, clear results immediately
    if (query.length < this.MIN_QUERY_LENGTH) {
      onResult({ available: [], unavailable: [] });
      onLoading(false);
      return () => this.clearTimeout(searchType);
    }

    // Check if we have cached results for this exact query
    const cachedResults = this.lastSearchResults.get(searchKey);
    if (cachedResults) {
      const { available, unavailable } = this.categorizeResults(
        cachedResults,
        searchType
      );
      onResult({ available, unavailable });
      onLoading(false);
      return () => this.clearTimeout(searchType);
    }

    // Set loading state
    onLoading(true);

    // Create debounced search function
    const timeoutId = setTimeout(async () => {
      try {
        logger.info(
          ENABLE_LOGGING,
          `Performing ${searchType} search for:`,
          query
        );

        let results: LanguageSearchResult[];

        switch (searchType) {
          case 'audio':
            results = await fuzzySearchService.searchAudioVersions(
              query,
              options
            );
            break;
          case 'text':
            results = await fuzzySearchService.searchTextVersions(
              query,
              options
            );
            break;
          case 'both':
            results = await fuzzySearchService.searchLanguagesWithVersions(
              query,
              options as LanguageSearchWithVersionsOptions
            );
            break;
          default:
            throw new Error(`Invalid search type: ${searchType}`);
        }

        // Cache the results
        this.lastSearchResults.set(searchKey, results);

        // Categorize results
        const { available, unavailable } = this.categorizeResults(
          results,
          searchType
        );

        onResult({ available, unavailable });
        onLoading(false);

        logger.info(ENABLE_LOGGING, `${searchType} search completed:`, {
          query,
          totalResults: results.length,
          availableCount: available.length,
          unavailableCount: unavailable.length,
        });
      } catch (error) {
        logger.error(ENABLE_LOGGING, `${searchType} search failed:`, error);
        onError(error instanceof Error ? error.message : 'Search failed');
        onLoading(false);
      }
    }, debounceMs);

    this.searchTimeouts.set(searchType, timeoutId);

    // Return cleanup function
    return () => this.clearTimeout(searchType);
  }

  /**
   * Categorize search results into available and unavailable
   */
  private categorizeResults(
    results: LanguageSearchResult[],
    searchType: 'audio' | 'text' | 'both'
  ): {
    available: LanguageSearchResult[];
    unavailable: LanguageSearchResult[];
  } {
    const available: LanguageSearchResult[] = [];
    const unavailable: LanguageSearchResult[] = [];

    for (const result of results) {
      let hasVersions = false;

      switch (searchType) {
        case 'audio':
          hasVersions = (result.audio_version_count || 0) > 0;
          break;
        case 'text':
          hasVersions = (result.text_version_count || 0) > 0;
          break;
        case 'both':
          hasVersions =
            (result.audio_version_count || 0) > 0 ||
            (result.text_version_count || 0) > 0;
          break;
      }

      if (hasVersions) {
        available.push(result);
      } else {
        unavailable.push(result);
      }
    }

    return { available, unavailable };
  }

  /**
   * Clear timeout for a specific search type
   */
  private clearTimeout(searchType: string): void {
    const timeoutId = this.searchTimeouts.get(searchType);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.searchTimeouts.delete(searchType);
    }
  }

  /**
   * Clear all search timeouts and cache
   */
  clearAll(): void {
    // Clear all timeouts
    for (const [, timeoutId] of this.searchTimeouts) {
      clearTimeout(timeoutId);
    }
    this.searchTimeouts.clear();

    // Clear cache
    this.lastSearchResults.clear();
  }

  /**
   * Clear cache for specific query patterns
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.lastSearchResults.clear();
      return;
    }

    // Clear cache entries that match the pattern
    for (const [key] of this.lastSearchResults) {
      if (key.includes(pattern)) {
        this.lastSearchResults.delete(key);
      }
    }
  }

  /**
   * Get immediate results without debouncing (for programmatic use)
   */
  async searchImmediate(
    query: string,
    searchType: 'audio' | 'text' | 'both',
    options: FuzzySearchOptions | LanguageSearchWithVersionsOptions = {}
  ): Promise<{
    available: LanguageSearchResult[];
    unavailable: LanguageSearchResult[];
  }> {
    if (query.length < this.MIN_QUERY_LENGTH) {
      return { available: [], unavailable: [] };
    }

    try {
      let results: LanguageSearchResult[];

      switch (searchType) {
        case 'audio':
          results = await fuzzySearchService.searchAudioVersions(
            query,
            options
          );
          break;
        case 'text':
          results = await fuzzySearchService.searchTextVersions(query, options);
          break;
        case 'both':
          results = await fuzzySearchService.searchLanguagesWithVersions(
            query,
            options as LanguageSearchWithVersionsOptions
          );
          break;
        default:
          throw new Error(`Invalid search type: ${searchType}`);
      }

      return this.categorizeResults(results, searchType);
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        `Immediate ${searchType} search failed:`,
        error
      );
      throw error;
    }
  }

  /**
   * Prefetch common searches for better performance
   */
  async prefetchCommonSearches(commonQueries: string[]): Promise<void> {
    for (const query of commonQueries) {
      if (query.length >= this.MIN_QUERY_LENGTH) {
        try {
          // Cache audio search
          const audioResults =
            await fuzzySearchService.searchAudioVersions(query);
          this.lastSearchResults.set(`audio-${query}`, audioResults);

          // Cache text search
          const textResults =
            await fuzzySearchService.searchTextVersions(query);
          this.lastSearchResults.set(`text-${query}`, textResults);

          logger.info(
            ENABLE_LOGGING,
            `Prefetched search results for: ${query}`
          );
        } catch (error) {
          logger.warn(
            ENABLE_LOGGING,
            `Failed to prefetch search for: ${query}`,
            error
          );
        }
      }
    }
  }
}

// Export singleton instance
export const languageSearchService = LanguageSearchService.getInstance();

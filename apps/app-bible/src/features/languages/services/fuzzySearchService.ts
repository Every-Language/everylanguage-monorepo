import { supabase } from '../../../shared/services/api/supabase';
import { logger } from '../../../shared/utils/logger';
import type { AudioVersion, TextVersion } from '../types/entities';

// Logging configuration for this module
const ENABLE_LOGGING = false;

// Version detail types from API response
export interface AudioVersionDetail {
  id: string;
  name: string;
  bible_version_id: string;
  project_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface TextVersionDetail {
  id: string;
  name: string;
  bible_version_id: string;
  project_id: string | null;
  text_version_source:
    | 'official_translation'
    | 'ai_transcription'
    | 'user_submitted';
  created_at: string;
  created_by: string | null;
}

// Enhanced interface for search results with version details
export interface LanguageSearchResult {
  similarity_threshold_used: number;
  alias_id: string;
  alias_name: string;
  alias_similarity_score: number;
  entity_id: string;
  entity_name: string;
  entity_level: string;
  entity_parent_id: string | null;
  audio_version_count?: number;
  text_version_count?: number;
  audio_versions?: AudioVersionDetail[];
  text_versions?: TextVersionDetail[];
  regions?: unknown; // Supabase JSON blob
}

export interface FuzzySearchOptions {
  maxResults?: number;
  minSimilarity?: number;
  includeRegions?: boolean;
}

export interface LanguageSearchWithVersionsOptions extends FuzzySearchOptions {
  filterType?: 'audio_only' | 'text_only' | 'both_required' | 'either';
}

export class FuzzySearchService {
  private static instance: FuzzySearchService;

  static getInstance(): FuzzySearchService {
    if (!FuzzySearchService.instance) {
      FuzzySearchService.instance = new FuzzySearchService();
    }
    return FuzzySearchService.instance;
  }

  /**
   * Convert API AudioVersionDetail to internal AudioVersion format
   */
  private convertToAudioVersion(
    detail: AudioVersionDetail,
    languageEntityId: string,
    languageName: string
  ): AudioVersion {
    return {
      id: detail.id,
      name: detail.name,
      languageEntityId,
      languageName,
      mediaFileCount: 0, // Will need to be fetched separately if needed
      createdAt: detail.created_at,
      updatedAt: detail.created_at, // API doesn't provide updated_at separately
    };
  }

  /**
   * Convert API TextVersionDetail to internal TextVersion format
   */
  private convertToTextVersion(
    detail: TextVersionDetail,
    languageEntityId: string,
    languageName: string
  ): TextVersion {
    return {
      id: detail.id,
      name: detail.name,
      languageEntityId,
      languageName,
      source:
        detail.text_version_source === 'official_translation'
          ? 'text_version'
          : 'project',
      verseCount: 0, // Will need to be fetched separately if needed
      createdAt: detail.created_at,
      updatedAt: detail.created_at, // API doesn't provide updated_at separately
    };
  }

  /**
   * Convert search result version details to internal format
   */
  convertVersionsToInternalFormat(searchResult: LanguageSearchResult): {
    audio: AudioVersion[];
    text: TextVersion[];
  } {
    const audioVersions = (searchResult.audio_versions || []).map(detail =>
      this.convertToAudioVersion(
        detail,
        searchResult.entity_id,
        searchResult.entity_name
      )
    );

    const textVersions = (searchResult.text_versions || []).map(detail =>
      this.convertToTextVersion(
        detail,
        searchResult.entity_id,
        searchResult.entity_name
      )
    );

    return {
      audio: audioVersions,
      text: textVersions,
    };
  }

  /**
   * Search all languages regardless of content availability
   */
  async searchLanguages(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<LanguageSearchResult[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      const {
        maxResults = 30,
        minSimilarity = 0.1,
        includeRegions = true,
      } = options;

      const { data, error } = await supabase.rpc('search_language_aliases', {
        search_query: query,
        max_results: maxResults,
        min_similarity: minSimilarity,
        include_regions: includeRegions,
      });

      if (error) {
        logger.error(ENABLE_LOGGING, 'Error searching languages:', error);
        return [];
      }

      return (data || []) as LanguageSearchResult[];
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error in searchLanguages:', error);
      return [];
    }
  }

  /**
   * Search languages filtered by content availability
   */
  async searchLanguagesWithVersions(
    query: string,
    options: LanguageSearchWithVersionsOptions = {}
  ): Promise<LanguageSearchResult[]> {
    try {
      if (query.length < 2) {
        return [];
      }

      const {
        maxResults = 30,
        minSimilarity = 0.1,
        includeRegions = true,
        filterType = 'either',
      } = options;

      const { data, error } = await supabase.rpc(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'search_language_aliases_with_versions' as any,
        {
          search_query: query,
          filter_type: filterType,
          max_results: maxResults,
          min_similarity: minSimilarity,
          include_regions: includeRegions,
        }
      );

      if (error) {
        logger.error(
          ENABLE_LOGGING,
          'Error searching languages with versions:',
          error
        );
        return [];
      }

      return (data || []) as LanguageSearchResult[];
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error in searchLanguagesWithVersions:',
        error
      );
      return [];
    }
  }

  /**
   * Search for audio versions specifically
   */
  async searchAudioVersions(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<LanguageSearchResult[]> {
    return this.searchLanguagesWithVersions(query, {
      ...options,
      filterType: 'audio_only',
    });
  }

  /**
   * Search for text versions specifically
   */
  async searchTextVersions(
    query: string,
    options: FuzzySearchOptions = {}
  ): Promise<LanguageSearchResult[]> {
    return this.searchLanguagesWithVersions(query, {
      ...options,
      filterType: 'text_only',
    });
  }

  /**
   * Get popular language versions for recommendations
   */
  async getPopularVersions(
    filterType:
      | 'audio_only'
      | 'text_only'
      | 'both_required'
      | 'either' = 'either',
    options: FuzzySearchOptions = {}
  ): Promise<LanguageSearchResult[]> {
    try {
      const { maxResults = 5, includeRegions = true } = options;

      const { data, error } = await supabase.rpc(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'recommend_language_versions' as any,
        {
          filter_type: filterType,
          max_results: maxResults,
          lookback_days: 90,
          include_regions: includeRegions,
        }
      );

      if (error) {
        logger.error(ENABLE_LOGGING, 'Error fetching popular versions:', error);
        return [];
      }

      return (data || []) as LanguageSearchResult[];
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Error in getPopularVersions:', error);
      return [];
    }
  }

  /**
   * Get available versions for a specific language entity
   * Note: This method is now redundant since searchLanguagesWithVersions
   * returns version details directly, but kept for backward compatibility
   */
  async getVersionsForLanguage(
    languageEntityId: string,
    versionType?: 'audio' | 'text'
  ): Promise<{
    audio: AudioVersion[];
    text: TextVersion[];
  }> {
    try {
      // Query audio versions
      const audioQuery = supabase
        .from('audio_versions')
        .select('*')
        .eq('language_entity_id', languageEntityId)
        .is('deleted_at', null);

      // Query text versions
      const textQuery = supabase
        .from('text_versions')
        .select('*')
        .eq('language_entity_id', languageEntityId)
        .is('deleted_at', null);

      const [audioResult, textResult] = await Promise.all([
        versionType === 'text' ? { data: [], error: null } : audioQuery,
        versionType === 'audio' ? { data: [], error: null } : textQuery,
      ]);

      if (audioResult.error && versionType !== 'text') {
        logger.error(
          ENABLE_LOGGING,
          'Error fetching audio versions:',
          audioResult.error
        );
      }

      if (textResult.error && versionType !== 'audio') {
        logger.error(
          ENABLE_LOGGING,
          'Error fetching text versions:',
          textResult.error
        );
      }

      // Convert to internal format - this is a simplified conversion since we don't have language name here
      const audioVersions: AudioVersion[] = (audioResult.data || []).map(
        item => ({
          id: item.id,
          name: item.name,
          languageEntityId: item.language_entity_id,
          languageName: '', // Will need to be resolved separately
          mediaFileCount: 0,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt:
            item.updated_at || item.created_at || new Date().toISOString(),
        })
      );

      const textVersions: TextVersion[] = (textResult.data || []).map(item => ({
        id: item.id,
        name: item.name,
        languageEntityId: item.language_entity_id,
        languageName: '', // Will need to be resolved separately
        source:
          item.text_version_source === 'official_translation'
            ? 'text_version'
            : 'project',
        verseCount: 0,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt:
          item.updated_at || item.created_at || new Date().toISOString(),
      }));

      return {
        audio: audioVersions,
        text: textVersions,
      };
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'Error getting versions for language:',
        error
      );
      return { audio: [], text: [] };
    }
  }

  /**
   * Extract version details from search results for a specific language
   */
  extractVersionsFromSearchResult(
    searchResult: LanguageSearchResult,
    versionType?: 'audio' | 'text'
  ): {
    audio: AudioVersionDetail[];
    text: TextVersionDetail[];
  } {
    const audio = searchResult.audio_versions || [];
    const text = searchResult.text_versions || [];

    if (versionType === 'audio') {
      return { audio, text: [] };
    } else if (versionType === 'text') {
      return { audio: [], text };
    }

    return { audio, text };
  }
}

// Export singleton instance
export const fuzzySearchService = FuzzySearchService.getInstance();

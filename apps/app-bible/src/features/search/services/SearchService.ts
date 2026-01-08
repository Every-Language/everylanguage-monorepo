import { powerSyncSystem } from '@/shared/services/powersync/PowerSyncSystem';
import { logger } from '@/shared/utils/logger';
import { SearchResult } from '../types/index';
import { searchIndexService } from './SearchIndexService';

const ENABLE_LOGGING = false;

export interface SearchOptions {
  maxResults?: number;
  includeHighlighting?: boolean;
}

interface FTSResult {
  id: string;
  verse_text: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  text_version_id: string;
  rank: number;
  book_id?: string;
  chapter_id?: string;
}

interface LIKEResult {
  id: string;
  verse_text: string;
  book_name: string;
  chapter_number: number;
  verse_number: number;
  text_version_id: string;
  book_id?: string;
  chapter_id?: string;
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Search verses using PowerSync FTS pattern
   */
  async searchVerses(
    query: string,
    currentTextVersionId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    if (!currentTextVersionId) {
      throw new Error('Text version ID is required for verse search');
    }

    // Check if FTS is ready
    const isFTSReady = await searchIndexService.isFTSReady();

    if (isFTSReady) {
      return this.searchWithFTS(query, currentTextVersionId, options);
    } else {
      return this.searchWithLIKE(query, currentTextVersionId, options);
    }
  }

  /**
   * Search using PowerSync FTS5
   */
  private async searchWithFTS(
    query: string,
    currentTextVersionId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { maxResults = 100 } = options;

    try {
      const searchQuery = `
        SELECT 
          id,
          verse_text,
          book_name,
          chapter_number,
          verse_number,
          text_version_id,
          rank
        FROM fts_verse_texts
        WHERE fts_verse_texts MATCH ? 
          AND text_version_id = ?
        ORDER BY rank
        LIMIT ?
      `;

      const results = (await powerSyncSystem.getAll(searchQuery, [
        this.buildFTSQuery(query),
        currentTextVersionId,
        maxResults,
      ])) as FTSResult[];

      logger.debug(ENABLE_LOGGING, 'PowerSync FTS search completed', {
        query,
        resultCount: results.length,
      });

      return this.transformFTSResults(
        results,
        options.includeHighlighting ?? true,
        query
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'PowerSync FTS search failed', error);
      // Fallback to LIKE search
      return this.searchWithLIKE(query, currentTextVersionId, options);
    }
  }

  /**
   * Fallback search using LIKE queries
   */
  private async searchWithLIKE(
    query: string,
    currentTextVersionId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { maxResults = 100 } = options;

    try {
      const searchQuery = `
        SELECT 
          vt.id,
          vt.verse_text,
          b.name as book_name,
          c.chapter_number,
          v.verse_number,
          vt.text_version_id
        FROM verse_texts vt
        JOIN verses v ON v.id = vt.verse_id
        JOIN chapters c ON c.id = v.chapter_id
        JOIN books b ON b.id = c.book_id
        WHERE vt.text_version_id = ?
          AND vt.verse_text LIKE ?
          AND vt.publish_status = 'published'
          AND vt.deleted_at IS NULL
        ORDER BY b.global_order, c.chapter_number, v.verse_number
        LIMIT ?
      `;

      const results = (await powerSyncSystem.getAll(searchQuery, [
        currentTextVersionId,
        `%${query}%`,
        maxResults,
      ])) as LIKEResult[];

      logger.debug(ENABLE_LOGGING, 'LIKE search completed', {
        query,
        resultCount: results.length,
      });

      return this.transformLIKEResults(
        results,
        options.includeHighlighting ?? true,
        query
      );
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'LIKE search failed', error);
      throw new Error('Search is temporarily unavailable');
    }
  }

  /**
   * Search books by name (version-independent)
   */
  async searchBooks(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const searchQuery = `
        SELECT 
          b.id as book_id,
          b.name as book_name,
          b.testament,
          COUNT(c.id) as chapter_count
        FROM books b
        LEFT JOIN chapters c ON c.book_id = b.id
        WHERE b.name LIKE ? OR LOWER(b.name) LIKE ?
        GROUP BY b.id, b.name, b.testament
        ORDER BY b.global_order
        LIMIT 20
      `;

      const results = await powerSyncSystem.getAll(searchQuery, [
        `%${query}%`,
        `%${query.toLowerCase()}%`,
      ]);

      logger.debug(ENABLE_LOGGING, 'Book search completed', {
        query,
        resultCount: results.length,
      });

      return results.map(result => ({
        id: result.book_id,
        type: 'book' as const,
        title: result.book_name,
        subtitle: result.testament,
        metadata: `${result.chapter_count} chapters`,
        bookId: result.book_id || '',
      }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Book search failed', error);
      throw new Error('Failed to search books');
    }
  }

  /**
   * Search chapters by reference (version-independent)
   */
  async searchChapters(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const searchQuery = `
        SELECT 
          c.id as chapter_id,
          c.chapter_number,
          b.id as book_id,
          b.name as book_name,
          b.book_number,
          b.testament,
          b.global_order,
          c.total_verses
        FROM chapters c
        JOIN books b ON b.id = c.book_id
        WHERE (b.name || ' ' || c.chapter_number) LIKE ?
           OR LOWER(b.name || ' ' || c.chapter_number) LIKE ?
        ORDER BY b.global_order, c.chapter_number
        LIMIT 20
      `;

      const results = await powerSyncSystem.getAll(searchQuery, [
        `%${query}%`,
        `%${query.toLowerCase()}%`,
      ]);

      logger.debug(ENABLE_LOGGING, 'Chapter search completed', {
        query,
        resultCount: results.length,
      });

      return results.map(result => ({
        id: result.chapter_id,
        type: 'chapter' as const,
        title: `${result.book_name} ${result.chapter_number}`,
        subtitle: result.book_name,
        metadata: `${result.total_verses} verses`,
        bookId: result.book_id || '',
        chapterId: result.chapter_id || '',
        // Add the properties that SearchModal expects
        book_id: result.book_id,
        book_name: result.book_name,
        chapter_number: result.chapter_number,
        book_number: result.book_number,
        testament: result.testament,
        global_order: result.global_order,
        total_verses: result.total_verses,
      }));
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Chapter search failed', error);
      throw new Error('Failed to search chapters');
    }
  }

  /**
   * Build FTS5 query following PowerSync pattern
   */
  private buildFTSQuery(query: string): string {
    const trimmedQuery = query.trim();

    // Handle exact phrases
    if (trimmedQuery.startsWith('"') && trimmedQuery.endsWith('"')) {
      return trimmedQuery;
    }

    // Add prefix matching for better results
    const terms = trimmedQuery.split(/\s+/).filter(term => term.length > 0);
    return terms.map(term => `"${term}"*`).join(' AND ');
  }

  /**
   * Transform FTS results to SearchResult format
   */
  private transformFTSResults(
    results: FTSResult[],
    includeHighlighting: boolean,
    query: string
  ): SearchResult[] {
    return results.map(result => ({
      id: result.id,
      type: 'verse' as const,
      title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`,
      subtitle: includeHighlighting
        ? this.highlightSearchTerms(result.verse_text, query)
        : result.verse_text,
      metadata: `${result.book_name} ${result.chapter_number}:${result.verse_number}`,
      bookId: result.book_id || '',
      chapterId: result.chapter_id || '',
      verseId: result.id,
      textVersionId: result.text_version_id,
      relevanceScore: result.rank,
    }));
  }

  /**
   * Transform LIKE results to SearchResult format
   */
  private transformLIKEResults(
    results: LIKEResult[],
    includeHighlighting: boolean,
    query: string
  ): SearchResult[] {
    return results.map(result => ({
      id: result.id,
      type: 'verse' as const,
      title: `${result.book_name} ${result.chapter_number}:${result.verse_number}`,
      subtitle: includeHighlighting
        ? this.highlightSearchTerms(result.verse_text, query)
        : result.verse_text,
      metadata: `${result.book_name} ${result.chapter_number}:${result.verse_number}`,
      bookId: result.book_id || '',
      chapterId: result.chapter_id || '',
      verseId: result.id,
      textVersionId: result.text_version_id,
      relevanceScore: 0,
    }));
  }

  /**
   * Highlight search terms in text
   */
  private highlightSearchTerms(text: string, query: string): string {
    if (!text || !query) return text;

    const terms = query
      .trim()
      .split(/\s+/)
      .map(term => term.replace(/["*]/g, '').trim())
      .filter(term => term.length > 0);

    let highlighted = text;
    terms.forEach(term => {
      if (term.length > 0) {
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
      }
    });

    return highlighted;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const searchService = SearchService.getInstance();

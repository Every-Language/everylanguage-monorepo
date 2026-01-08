import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';
import type {
  BookWithMetadata,
  ChapterWithMetadata,
} from '@/features/bible/types';
import { BibleNavigationServiceV2 } from '@/features/bible/services/BibleNavigationServiceV2';
import { BookResolutionService } from '@/features/bible/services/BookResolutionService';
import { logger } from '@/shared/utils/logger';
import type {
  SearchResult,
  BookSearchResult,
  ChapterSearchResult,
  VerseSearchResult,
} from '../types';

export interface SearchNavigationHandlers {
  navigateToBook: (result: BookSearchResult) => void;
  navigateToChapter: (result: ChapterSearchResult) => void;
  navigateToVerse: (result: VerseSearchResult) => void;
}

// Note: transformSearchResultToBook function removed - now using BookResolutionService.createMinimalBook()

/**
 * Transform search result to ChapterWithMetadata for navigation
 */
const transformSearchResultToChapter = (
  result: ChapterSearchResult
): ChapterWithMetadata => {
  return {
    // Core chapter properties
    id: result.id,
    chapter_number: result.chapter_number,
    book_id: result.book_id,
    total_verses: result.total_verses ?? 0,
    global_order: result.global_order ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    // Extended metadata (will be resolved by the screen)
    title: `${result.book_name} ${result.chapter_number}`,
    verseRange: `1-${result.total_verses ?? 0}`,
    mediaAvailability: 'complete' as const,
    versesMarked: true,
    mediaFileCount: 0,
    downloadedFileCount: 0,
    isAvailable: true,
    isDownloaded: false,
    hasMediaFiles: true, // Assume true, will be resolved by the screen
  };
};

/**
 * Create search navigation handlers
 */
export const createSearchNavigationHandlers = (
  _navigation: NativeStackNavigationProp<RootStackParamList>
): SearchNavigationHandlers => {
  /**
   * Navigate to book - behaves exactly like clicking a book from BibleBooksScreen
   */
  const navigateToBook = (result: BookSearchResult) => {
    try {
      // Validate required data
      if (!result.id || !result.name) {
        throw new Error('Invalid book data');
      }

      // Create a minimal book object from search results
      // The BookResolutionService will ensure it gets resolved to a complete book
      const bookWithMetadata = BookResolutionService.createMinimalBook({
        id: result.id,
        name: result.name,
        book_number: result.book_number,
        testament: result.testament,
        global_order: result.global_order ?? null,
        chaptersCount: result.chapter_count,
      });

      // Use the new store-based Bible navigation service
      BibleNavigationServiceV2.navigateToBook(bookWithMetadata);
    } catch (error) {
      logger.error(true, 'Search book navigation failed:', error);
      // Fallback: navigate to books screen
      BibleNavigationServiceV2.navigateToBooks();
    }
  };

  /**
   * Navigate to chapter - goes directly to chapter verses
   */
  const navigateToChapter = (result: ChapterSearchResult) => {
    try {
      // Validate required data
      if (!result.id || !result.book_id || !result.chapter_number) {
        throw new Error('Invalid chapter data');
      }

      // Create book metadata for navigation
      const bookWithMetadata: BookWithMetadata = {
        id: result.book_id,
        name: result.book_name,
        book_number: result.book_number ?? 0,
        testament:
          result.testament === 'OT'
            ? 'old'
            : result.testament === 'NT'
              ? 'new'
              : null,
        global_order: result.book_number ?? 0,
        bible_version_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create chapter metadata for navigation
      const chapterWithMetadata = transformSearchResultToChapter(result);

      // Use the new store-based Bible navigation service
      BibleNavigationServiceV2.navigateToChapter(
        bookWithMetadata,
        chapterWithMetadata
      );
    } catch (error) {
      logger.error(true, 'Search chapter navigation failed:', error);
      // Fallback: navigate to books screen
      BibleNavigationServiceV2.navigateToBooks();
    }
  };

  /**
   * Navigate to verse - goes to chapter with specific verse highlighted
   */
  const navigateToVerse = (result: VerseSearchResult) => {
    try {
      // Validate required data
      if (!result.id || !result.chapter_id || !result.book_id) {
        throw new Error('Invalid verse data');
      }

      // Create book metadata for navigation
      const bookWithMetadata: BookWithMetadata = {
        id: result.book_id,
        name: result.book_name,
        book_number: result.book_number ?? 0,
        testament:
          result.testament === 'OT'
            ? 'old'
            : result.testament === 'NT'
              ? 'new'
              : null,
        global_order: result.book_number ?? 0,
        bible_version_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create chapter metadata for navigation
      const chapterWithMetadata: ChapterWithMetadata = {
        id: result.chapter_id,
        chapter_number: result.chapter_number,
        book_id: result.book_id,
        total_verses: result.total_verses ?? 0,
        global_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        title: `${result.book_name} ${result.chapter_number}`,
        verseRange: `1-${result.total_verses ?? 0}`,
        mediaAvailability: 'complete' as const,
        versesMarked: true,
        mediaFileCount: 0,
        downloadedFileCount: 0,
        isAvailable: true,
        isDownloaded: false,
        hasMediaFiles: true,
      };

      // Use the new store-based Bible navigation service
      BibleNavigationServiceV2.navigateToVerse(
        bookWithMetadata,
        chapterWithMetadata,
        result.id
      );
    } catch (error) {
      logger.error(true, 'Search verse navigation failed:', error);
      // Fallback: navigate to books screen
      BibleNavigationServiceV2.navigateToBooks();
    }
  };

  return {
    navigateToBook,
    navigateToChapter,
    navigateToVerse,
  };
};

/**
 * Unified search result press handler
 * Now uses store-based navigation, no navigation parameter needed
 */
export const createSearchResultPressHandler = () => {
  const handlers = createSearchNavigationHandlers(
    {} as NativeStackNavigationProp<RootStackParamList>
  ); // Navigation not needed anymore

  return (result: SearchResult) => {
    try {
      switch (result.type) {
        case 'book':
          if ('name' in result && 'book_number' in result) {
            handlers.navigateToBook(result as BookSearchResult);
          }
          break;
        case 'chapter':
          if ('chapter_number' in result && 'book_id' in result) {
            handlers.navigateToChapter(result as ChapterSearchResult);
          }
          break;
        case 'verse':
          if ('verse_number' in result && 'chapter_id' in result) {
            handlers.navigateToVerse(result as VerseSearchResult);
          }
          break;
        default:
          logger.warn(true, 'Unknown search result type:', result.type);
          BibleNavigationServiceV2.navigateToBooks();
      }
    } catch (error) {
      logger.error(true, 'Search result navigation error:', error);
      BibleNavigationServiceV2.navigateToBooks();
    }
  };
};

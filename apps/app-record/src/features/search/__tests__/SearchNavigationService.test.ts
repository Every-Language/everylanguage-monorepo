import {
  createSearchNavigationHandlers,
  createSearchResultPressHandler,
} from '../services/SearchNavigationService';
import type {
  BookSearchResult,
  ChapterSearchResult,
  VerseSearchResult,
  SearchResult,
} from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/navigation/RootNavigator';
import { useBibleNavigationStore } from '@/features/bible/store/bibleNavigationStore';

// Mock navigation object
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => true),
  getState: jest.fn(() => ({
    routes: [{ name: 'SearchModal' }],
    index: 0,
  })),
} as unknown as NativeStackNavigationProp<RootStackParamList>;

describe('SearchNavigationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Bible navigation store before each test
    useBibleNavigationStore.getState().reset();
  });

  describe('createSearchNavigationHandlers', () => {
    it('should create navigation handlers', () => {
      const handlers = createSearchNavigationHandlers(mockNavigation);

      expect(handlers).toHaveProperty('navigateToBook');
      expect(handlers).toHaveProperty('navigateToChapter');
      expect(handlers).toHaveProperty('navigateToVerse');
      expect(typeof handlers.navigateToBook).toBe('function');
      expect(typeof handlers.navigateToChapter).toBe('function');
      expect(typeof handlers.navigateToVerse).toBe('function');
    });
  });

  describe('navigateToBook', () => {
    it('should navigate to BibleChapters with book data', () => {
      const handlers = createSearchNavigationHandlers(mockNavigation);
      const bookResult: BookSearchResult = {
        type: 'book',
        id: 'book-1',
        name: 'Genesis',
        title: 'Genesis',
        book_number: 1,
        testament: 'OT',
        chapter_count: 50,
        global_order: 1,
      };

      handlers.navigateToBook(bookResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('chapters');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toBeNull();
      expect(storeState.selectedVerseId).toBeNull();
    });

    it('should handle invalid book data gracefully', () => {
      const handlers = createSearchNavigationHandlers(mockNavigation);
      const invalidBookResult = {
        type: 'book' as const,
        id: '',
        name: '',
        title: '',
        book_number: 0,
        testament: 'OT' as const,
        chapter_count: 0,
      };

      handlers.navigateToBook(invalidBookResult);

      // Check that the store state was reset to books screen due to invalid data
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('books');
      expect(storeState.selectedBook).toBeNull();
      expect(storeState.selectedChapter).toBeNull();
      expect(storeState.selectedVerseId).toBeNull();
    });
  });

  describe('navigateToChapter', () => {
    it('should navigate to BibleVerses with chapter data', () => {
      const handlers = createSearchNavigationHandlers(mockNavigation);
      const chapterResult: ChapterSearchResult = {
        type: 'chapter',
        id: 'chapter-1',
        title: 'Genesis 1',
        chapter_number: 1,
        book_id: 'book-1',
        book_name: 'Genesis',
        book_number: 1,
        testament: 'OT',
        total_verses: 31,
        global_order: 1,
      };

      handlers.navigateToChapter(chapterResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('verses');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toEqual(
        expect.objectContaining({
          id: 'chapter-1',
          chapter_number: 1,
          book_id: 'book-1',
          total_verses: 31,
        })
      );
      expect(storeState.selectedVerseId).toBeNull();
    });
  });

  describe('navigateToVerse', () => {
    it('should navigate to BibleVerses with verse targeting', () => {
      const handlers = createSearchNavigationHandlers(mockNavigation);
      const verseResult: VerseSearchResult = {
        type: 'verse',
        id: 'verse-1',
        title: 'Genesis 1:1',
        verse_number: 1,
        chapter_id: 'chapter-1',
        chapter_number: 1,
        book_id: 'book-1',
        book_name: 'Genesis',
        book_number: 1,
        testament: 'OT',
        verse_text: 'In the beginning God created the heavens and the earth.',
        text_snippet: 'In the beginning God created...',
        total_verses: 31,
      };

      handlers.navigateToVerse(verseResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('verses');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toEqual(
        expect.objectContaining({
          id: 'chapter-1',
          chapter_number: 1,
        })
      );
      expect(storeState.selectedVerseId).toBe('verse-1');
    });
  });

  describe('createSearchResultPressHandler', () => {
    it('should handle book search results', () => {
      const handler = createSearchResultPressHandler();
      const bookResult: BookSearchResult & { type: 'book' } = {
        type: 'book',
        id: 'book-1',
        name: 'Genesis',
        title: 'Genesis',
        book_number: 1,
        testament: 'OT',
        chapter_count: 50,
      };

      handler(bookResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('chapters');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toBeNull();
      expect(storeState.selectedVerseId).toBeNull();
    });

    it('should handle chapter search results', () => {
      const handler = createSearchResultPressHandler();
      const chapterResult: ChapterSearchResult & { type: 'chapter' } = {
        type: 'chapter',
        id: 'chapter-1',
        title: 'Genesis 1',
        chapter_number: 1,
        book_id: 'book-1',
        book_name: 'Genesis',
        total_verses: 31,
      };

      handler(chapterResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('verses');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toEqual(
        expect.objectContaining({
          id: 'chapter-1',
          chapter_number: 1,
        })
      );
      expect(storeState.selectedVerseId).toBeNull();
    });

    it('should handle verse search results', () => {
      const handler = createSearchResultPressHandler();
      const verseResult: VerseSearchResult & { type: 'verse' } = {
        type: 'verse',
        id: 'verse-1',
        title: 'Genesis 1:1',
        verse_number: 1,
        chapter_id: 'chapter-1',
        chapter_number: 1,
        book_id: 'book-1',
        book_name: 'Genesis',
        verse_text: 'In the beginning God created the heavens and the earth.',
        text_snippet: 'In the beginning God created...',
      };

      handler(verseResult);

      // Check that the store state was updated correctly
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('verses');
      expect(storeState.selectedBook).toEqual(
        expect.objectContaining({
          id: 'book-1',
          name: 'Genesis',
        })
      );
      expect(storeState.selectedChapter).toEqual(
        expect.objectContaining({
          id: 'chapter-1',
          chapter_number: 1,
        })
      );
      expect(storeState.selectedVerseId).toBe('verse-1');
    });

    it('should handle unknown result types gracefully', () => {
      const handler = createSearchResultPressHandler();
      const unknownResult = {
        type: 'unknown',
        id: 'test',
        title: 'Unknown',
      } as unknown as SearchResult;

      handler(unknownResult);

      // Check that the store state was reset to books screen for unknown types
      const storeState = useBibleNavigationStore.getState();
      expect(storeState.currentScreen).toBe('books');
      expect(storeState.selectedBook).toBeNull();
      expect(storeState.selectedChapter).toBeNull();
      expect(storeState.selectedVerseId).toBeNull();
    });
  });
});

import type { BookWithMetadata, ChapterWithMetadata } from '../types';
import { useBibleNavigationStore } from '../store/bibleNavigationStore';

/**
 * Bible Navigation Service V2
 * Uses Zustand store for state management instead of React Navigation
 * This eliminates navigation context issues and provides better control
 */
export class BibleNavigationServiceV2 {
  /**
   * Navigate to the Bible books screen
   */
  static navigateToBooks(): void {
    const store = useBibleNavigationStore.getState();
    store.navigateToBooks();
  }

  /**
   * Navigate to a specific book's chapters
   */
  static navigateToBook(book: BookWithMetadata): void {
    const store = useBibleNavigationStore.getState();
    store.navigateToBook(book);
  }

  /**
   * Navigate to a specific chapter's verses
   */
  static navigateToChapter(
    book: BookWithMetadata,
    chapter: ChapterWithMetadata
  ): void {
    const store = useBibleNavigationStore.getState();
    store.navigateToChapter(book, chapter);
  }

  /**
   * Navigate to a specific verse within a chapter
   */
  static navigateToVerse(
    book: BookWithMetadata,
    chapter: ChapterWithMetadata,
    verseId: string
  ): void {
    const store = useBibleNavigationStore.getState();
    store.navigateToVerse(book, chapter, verseId);
  }

  /**
   * Go back to the previous screen
   */
  static goBack(): void {
    const store = useBibleNavigationStore.getState();
    store.goBack();
  }

  /**
   * Check if we can go back
   */
  static canGoBack(): boolean {
    const store = useBibleNavigationStore.getState();
    return store.canGoBack();
  }

  /**
   * Get current navigation state
   */
  static getCurrentState() {
    const store = useBibleNavigationStore.getState();
    return {
      currentScreen: store.currentScreen,
      selectedBook: store.selectedBook,
      selectedChapter: store.selectedChapter,
      selectedVerseId: store.selectedVerseId,
      canGoBack: store.canGoBack(),
    };
  }

  /**
   * Reset navigation to initial state
   */
  static reset(): void {
    const store = useBibleNavigationStore.getState();
    store.reset();
  }
}

/**
 * Hook for easy Bible navigation from any component
 * This replaces the need for navigation props
 */
export const useBibleNavigationV2 = () => {
  const store = useBibleNavigationStore();

  return {
    // Current state
    currentScreen: store.currentScreen,
    selectedBook: store.selectedBook,
    selectedChapter: store.selectedChapter,
    selectedVerseId: store.selectedVerseId,
    canGoBack: store.canGoBack(),

    // Navigation actions
    navigateToBooks: store.navigateToBooks,
    navigateToBook: store.navigateToBook,
    navigateToChapter: store.navigateToChapter,
    navigateToVerse: store.navigateToVerse,
    goBack: store.goBack,

    // Utility actions
    reset: store.reset,
  };
};

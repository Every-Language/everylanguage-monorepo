import { create } from 'zustand';
import type { BookWithMetadata, ChapterWithMetadata } from '../types';

export type BibleScreen = 'books' | 'chapters' | 'verses';

export interface BibleNavigationState {
  currentScreen: BibleScreen;
  selectedBook: BookWithMetadata | null;
  selectedChapter: ChapterWithMetadata | null;
  selectedVerseId: string | null;
  navigationHistory: Array<{
    screen: BibleScreen;
    book?: BookWithMetadata;
    chapter?: ChapterWithMetadata;
    verseId?: string;
    timestamp: number;
  }>;
}

export interface BibleNavigationActions {
  // Navigation actions
  navigateToBooks: () => void;
  navigateToBook: (book: BookWithMetadata) => void;
  navigateToChapter: (
    book: BookWithMetadata,
    chapter: ChapterWithMetadata
  ) => void;
  navigateToVerse: (
    book: BookWithMetadata,
    chapter: ChapterWithMetadata,
    verseId: string
  ) => void;

  // Navigation history
  goBack: () => void;
  canGoBack: () => boolean;
  clearHistory: () => void;

  // Direct state setters (for external navigation)
  setCurrentScreen: (screen: BibleScreen) => void;
  setSelectedBook: (book: BookWithMetadata | null) => void;
  setSelectedChapter: (chapter: ChapterWithMetadata | null) => void;
  setSelectedVerse: (verseId: string | null) => void;

  // Reset navigation
  reset: () => void;
}

export type BibleNavigationStore = BibleNavigationState &
  BibleNavigationActions;

const initialState: BibleNavigationState = {
  currentScreen: 'books',
  selectedBook: null,
  selectedChapter: null,
  selectedVerseId: null,
  navigationHistory: [],
};

export const useBibleNavigationStore = create<BibleNavigationStore>(
  (set, get) => ({
    ...initialState,

    // Navigation actions
    navigateToBooks: () => {
      const state = get();
      set({
        currentScreen: 'books',
        selectedBook: null,
        selectedChapter: null,
        selectedVerseId: null,
        navigationHistory: [
          ...state.navigationHistory,
          {
            screen: 'books',
            timestamp: Date.now(),
          },
        ],
      });
    },

    navigateToBook: (book: BookWithMetadata) => {
      const state = get();
      set({
        currentScreen: 'chapters',
        selectedBook: book,
        selectedChapter: null,
        selectedVerseId: null,
        navigationHistory: [
          ...state.navigationHistory,
          {
            screen: 'chapters',
            book,
            timestamp: Date.now(),
          },
        ],
      });
    },

    navigateToChapter: (
      book: BookWithMetadata,
      chapter: ChapterWithMetadata
    ) => {
      const state = get();

      set({
        currentScreen: 'verses',
        selectedBook: book,
        selectedChapter: chapter,
        selectedVerseId: null,
        navigationHistory: [
          ...state.navigationHistory,
          {
            screen: 'verses',
            book,
            chapter,
            timestamp: Date.now(),
          },
        ],
      });
    },

    navigateToVerse: (
      book: BookWithMetadata,
      chapter: ChapterWithMetadata,
      verseId: string
    ) => {
      const state = get();
      set({
        currentScreen: 'verses',
        selectedBook: book,
        selectedChapter: chapter,
        selectedVerseId: verseId,
        navigationHistory: [
          ...state.navigationHistory,
          {
            screen: 'verses',
            book,
            chapter,
            verseId,
            timestamp: Date.now(),
          },
        ],
      });
    },

    // Navigation history
    goBack: () => {
      const state = get();
      if (state.navigationHistory.length <= 1) {
        // If we're at the first screen, go to books
        get().navigateToBooks();
        return;
      }

      // Remove the current entry and get the previous one
      const newHistory = state.navigationHistory.slice(0, -1);
      const previousEntry = newHistory[newHistory.length - 1];

      if (!previousEntry) {
        get().navigateToBooks();
        return;
      }

      set({
        currentScreen: previousEntry.screen,
        selectedBook: previousEntry.book || null,
        selectedChapter: previousEntry.chapter || null,
        selectedVerseId: previousEntry.verseId || null,
        navigationHistory: newHistory,
      });
    },

    canGoBack: () => {
      const state = get();
      return state.navigationHistory.length > 1;
    },

    clearHistory: () => {
      set({
        navigationHistory: [],
      });
    },

    // Direct state setters
    setCurrentScreen: (screen: BibleScreen) => {
      set({ currentScreen: screen });
    },

    setSelectedBook: (book: BookWithMetadata | null) => {
      set({ selectedBook: book });
    },

    setSelectedChapter: (chapter: ChapterWithMetadata | null) => {
      set({ selectedChapter: chapter });
    },

    setSelectedVerse: (verseId: string | null) => {
      set({ selectedVerseId: verseId });
    },

    // Reset navigation
    reset: () => {
      set(initialState);
    },
  })
);

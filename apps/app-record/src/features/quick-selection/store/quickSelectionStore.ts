import { create } from 'zustand';
import type {
  BookWithMetadata,
  ChapterWithMetadata,
  Verse,
} from '@/features/bible/types';
import { BibleNavigationServiceV2 } from '@/features/bible/services/BibleNavigationServiceV2';

export type QuickSelectionMode = 'book' | 'chapter' | 'verse';

export interface QuickSelectionState {
  // Mode management
  currentMode: QuickSelectionMode;

  // Search state - preserved per mode
  searchQueries: {
    book: string;
    chapter: string;
    verse: string;
  };

  // Selection state
  selectedBook: BookWithMetadata | null;
  selectedChapter: ChapterWithMetadata | null;
  selectedVerse: Verse | null;

  // Navigation history for proper back behavior
  navigationHistory: Array<{
    mode: QuickSelectionMode;
    timestamp: number;
    bookId?: string | undefined;
    chapterId?: string | undefined;
  }>;

  // Modal control
  onClose: (() => void) | null;
}

export interface QuickSelectionActions {
  // Mode navigation
  setMode: (mode: QuickSelectionMode) => void;
  goToBookSelection: () => void;
  goToChapterSelection: (book: BookWithMetadata) => void;
  goToVerseSelection: (chapter: ChapterWithMetadata) => void;

  // Search functionality - mode-specific
  setSearchQuery: (mode: QuickSelectionMode, query: string) => void;
  clearSearch: (mode: QuickSelectionMode) => void;
  getCurrentSearchQuery: () => string;

  // Selection handlers
  selectBook: (book: BookWithMetadata) => void;
  selectChapter: (chapter: ChapterWithMetadata) => void;
  selectVerse: (verse: Verse) => void;

  // Navigation with search preservation
  goBack: () => void;
  canGoBack: () => boolean;

  // Reset functionality
  reset: () => void;
  resetAndClose: () => void;

  // Modal control
  setOnClose: (onClose: () => void) => void;
}

export const useQuickSelectionStore = create<
  QuickSelectionState & QuickSelectionActions
>((set, get) => ({
  // Initial state
  currentMode: 'book',
  searchQueries: {
    book: '',
    chapter: '',
    verse: '',
  },
  selectedBook: null,
  selectedChapter: null,
  selectedVerse: null,
  navigationHistory: [],
  onClose: null,

  // Actions
  setMode: mode => set({ currentMode: mode }),

  goToBookSelection: () =>
    set(state => ({
      currentMode: 'book',
      selectedBook: null,
      selectedChapter: null,
      selectedVerse: null,
      navigationHistory: [
        ...state.navigationHistory,
        {
          mode: 'book',
          timestamp: Date.now(),
        },
      ],
    })),

  goToChapterSelection: book =>
    set(state => ({
      currentMode: 'chapter',
      selectedBook: book,
      selectedChapter: null,
      selectedVerse: null,
      navigationHistory: [
        ...state.navigationHistory,
        {
          mode: 'chapter',
          timestamp: Date.now(),
          bookId: book.id,
        },
      ],
    })),

  goToVerseSelection: chapter =>
    set(state => ({
      currentMode: 'verse',
      selectedChapter: chapter,
      selectedVerse: null,
      navigationHistory: [
        ...state.navigationHistory,
        {
          mode: 'verse',
          timestamp: Date.now(),
          bookId: state.selectedBook?.id || undefined,
          chapterId: chapter.id,
        },
      ],
    })),

  // Enhanced search functionality
  setSearchQuery: (mode, query) => {
    set(state => ({
      searchQueries: {
        ...state.searchQueries,
        [mode]: query,
      },
    }));
  },

  clearSearch: mode => {
    set(state => ({
      searchQueries: {
        ...state.searchQueries,
        [mode]: '',
      },
    }));
  },

  getCurrentSearchQuery: () => {
    const state = get();
    return state.searchQueries[state.currentMode];
  },

  selectBook: book => {
    set({ selectedBook: book });
    get().goToChapterSelection(book);
  },

  selectChapter: chapter => {
    set({ selectedChapter: chapter });
    get().goToVerseSelection(chapter);
  },

  selectVerse: verse => {
    set({ selectedVerse: verse });
    // Navigate to bible chapter with verse highlighted
    const state = get();
    if (state.selectedBook && state.selectedChapter) {
      BibleNavigationServiceV2.navigateToVerse(
        state.selectedBook,
        state.selectedChapter,
        verse.id
      );
    }
    // Close the quick selection modal after navigation
    get().resetAndClose();
  },

  // Enhanced back navigation with search preservation
  goBack: () => {
    const state = get();
    if (state.navigationHistory.length <= 1) {
      // If we're at the first screen, go to book selection
      get().goToBookSelection();
      return;
    }

    // Remove the current entry and get the previous one
    const newHistory = state.navigationHistory.slice(0, -1);
    const previousEntry = newHistory[newHistory.length - 1];

    if (!previousEntry) {
      get().goToBookSelection();
      return;
    }

    set({
      currentMode: previousEntry.mode,
      navigationHistory: newHistory,
      // Preserve selections based on mode
      selectedVerse:
        previousEntry.mode === 'verse' ? state.selectedVerse : null,
      selectedChapter:
        previousEntry.mode === 'verse' ? state.selectedChapter : null,
      // Search query is already preserved in searchQueries
    });
  },

  canGoBack: () => {
    const state = get();
    return state.navigationHistory.length > 1;
  },

  reset: () =>
    set({
      currentMode: 'book',
      searchQueries: {
        book: '',
        chapter: '',
        verse: '',
      },
      selectedBook: null,
      selectedChapter: null,
      selectedVerse: null,
      navigationHistory: [],
    }),

  resetAndClose: () => {
    get().reset();
    const state = get();
    if (state.onClose) {
      state.onClose();
    }
  },

  setOnClose: onClose => {
    set({ onClose });
  },
}));

import { useCallback } from 'react';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { getRootNavigationRef } from '@/app/navigation/navigationRef';
import type { BookWithMetadata, ChapterWithMetadata } from '../types';
import type { BibleStackParamList } from '../navigation/BibleStackNavigator';
import { useBibleNavigationStore } from '../store/bibleNavigationStore';

type BibleRouteName = keyof BibleStackParamList;

const navigateToBibleRoute = <RouteName extends BibleRouteName>(
  routeName: RouteName,
  params: BibleStackParamList[RouteName]
): boolean => {
  const navigationRef = getRootNavigationRef();
  if (!navigationRef || !navigationRef.isReady()) {
    return false;
  }

  const bibleParams: {
    screen: RouteName;
    params?: BibleStackParamList[RouteName];
  } = { screen: routeName };
  if (params) {
    bibleParams.params = params;
  }

  navigationRef.navigate('Home', {
    screen: 'Bible',
    params:
      bibleParams as unknown as NavigatorScreenParams<BibleStackParamList>,
  });

  return true;
};

/**
 * Bible Navigation Service V2
 * Uses native route navigation and keeps the Bible store synchronized.
 */
export class BibleNavigationServiceV2 {
  /**
   * Navigate to the Bible books screen.
   */
  static navigateToBooks(): void {
    const store = useBibleNavigationStore.getState();

    store.setCurrentScreen('books');
    store.setSelectedBook(null);
    store.setSelectedChapter(null);
    store.setSelectedVerse(null);

    const didNavigate = navigateToBibleRoute('BibleBooks', undefined);
    if (!didNavigate) {
      store.navigateToBooks();
    }
  }

  /**
   * Navigate to a specific book's chapters.
   */
  static navigateToBook(book: BookWithMetadata): void {
    const store = useBibleNavigationStore.getState();

    store.setCurrentScreen('chapters');
    store.setSelectedBook(book);
    store.setSelectedChapter(null);
    store.setSelectedVerse(null);

    const didNavigate = navigateToBibleRoute('BibleChapters', {
      bookId: book.id,
    });
    if (!didNavigate) {
      store.navigateToBook(book);
    }
  }

  /**
   * Navigate to a specific chapter's verses.
   */
  static navigateToChapter(
    book: BookWithMetadata,
    chapter: ChapterWithMetadata
  ): void {
    const store = useBibleNavigationStore.getState();

    store.setCurrentScreen('verses');
    store.setSelectedBook(book);
    store.setSelectedChapter(chapter);
    store.setSelectedVerse(null);

    const didNavigate = navigateToBibleRoute('BibleVersesChapter', {
      bookId: book.id,
      chapterId: chapter.id,
    });
    if (!didNavigate) {
      store.navigateToChapter(book, chapter);
    }
  }

  /**
   * Navigate to a specific verse within a chapter.
   */
  static navigateToVerse(
    book: BookWithMetadata,
    chapter: ChapterWithMetadata,
    verseId: string
  ): void {
    const store = useBibleNavigationStore.getState();

    store.setCurrentScreen('verses');
    store.setSelectedBook(book);
    store.setSelectedChapter(chapter);
    store.setSelectedVerse(verseId);

    const didNavigate = navigateToBibleRoute('BibleVerses', {
      bookId: book.id,
      chapterId: chapter.id,
      verseId,
    });
    if (!didNavigate) {
      store.navigateToVerse(book, chapter, verseId);
    }
  }

  /**
   * Go back to the previous screen.
   */
  static goBack(): void {
    const navigationRef = getRootNavigationRef();
    if (navigationRef && navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }

    const store = useBibleNavigationStore.getState();
    store.goBack();
  }

  /**
   * Check if we can go back.
   */
  static canGoBack(): boolean {
    const navigationRef = getRootNavigationRef();
    if (navigationRef && navigationRef.isReady()) {
      return navigationRef.canGoBack();
    }

    const store = useBibleNavigationStore.getState();
    return store.canGoBack();
  }

  /**
   * Get current navigation state.
   */
  static getCurrentState(): {
    currentScreen: string;
    selectedBook: BookWithMetadata | null;
    selectedChapter: ChapterWithMetadata | null;
    selectedVerseId: string | null;
    canGoBack: boolean;
  } {
    const store = useBibleNavigationStore.getState();

    return {
      currentScreen: store.currentScreen,
      selectedBook: store.selectedBook,
      selectedChapter: store.selectedChapter,
      selectedVerseId: store.selectedVerseId,
      canGoBack: this.canGoBack(),
    };
  }

  /**
   * Reset navigation to initial state.
   */
  static reset(): void {
    const store = useBibleNavigationStore.getState();
    store.reset();
    navigateToBibleRoute('BibleBooks', undefined);
  }
}

/**
 * Hook for easy Bible navigation from any component.
 */
export const useBibleNavigationV2 = () => {
  const store = useBibleNavigationStore();

  const navigateToBooks = useCallback((): void => {
    BibleNavigationServiceV2.navigateToBooks();
  }, []);

  const navigateToBook = useCallback((book: BookWithMetadata): void => {
    BibleNavigationServiceV2.navigateToBook(book);
  }, []);

  const navigateToChapter = useCallback(
    (book: BookWithMetadata, chapter: ChapterWithMetadata): void => {
      BibleNavigationServiceV2.navigateToChapter(book, chapter);
    },
    []
  );

  const navigateToVerse = useCallback(
    (book: BookWithMetadata, chapter: ChapterWithMetadata, verseId: string) => {
      BibleNavigationServiceV2.navigateToVerse(book, chapter, verseId);
    },
    []
  );

  const goBack = useCallback((): void => {
    BibleNavigationServiceV2.goBack();
  }, []);

  const reset = useCallback((): void => {
    BibleNavigationServiceV2.reset();
  }, []);

  return {
    // Current state
    currentScreen: store.currentScreen,
    selectedBook: store.selectedBook,
    selectedChapter: store.selectedChapter,
    selectedVerseId: store.selectedVerseId,
    canGoBack: BibleNavigationServiceV2.canGoBack(),

    // Navigation actions
    navigateToBooks,
    navigateToBook,
    navigateToChapter,
    navigateToVerse,
    goBack,

    // Utility actions
    reset,
  };
};

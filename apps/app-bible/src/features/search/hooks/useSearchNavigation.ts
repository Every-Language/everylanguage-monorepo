// import { useNavigation } from '@react-navigation/native'; // Not used in store-based system
import { useCallback } from 'react';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Not used
// import type { RootStackParamList } from '@/app/navigation/RootNavigator'; // Not used
import { createSearchResultPressHandler } from '../services/SearchNavigationService';
import type {
  SearchResult,
  BookSearchResult,
  ChapterSearchResult,
  VerseSearchResult,
} from '../types';

/**
 * Hook for handling search result navigation
 * Provides unified navigation handlers that behave exactly like user clicks
 */
export const useSearchNavigation = () => {
  // Note: navigation is not used in the new store-based system
  // const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Create the unified press handler
  const handleSearchResultPress = createSearchResultPressHandler();

  // Individual navigation handlers for specific use cases
  const navigateToBook = useCallback(
    (result: BookSearchResult) => {
      handleSearchResultPress(result as SearchResult);
    },
    [handleSearchResultPress]
  );

  const navigateToChapter = useCallback(
    (result: ChapterSearchResult) => {
      handleSearchResultPress(result as SearchResult);
    },
    [handleSearchResultPress]
  );

  const navigateToVerse = useCallback(
    (result: VerseSearchResult) => {
      handleSearchResultPress(result as SearchResult);
    },
    [handleSearchResultPress]
  );

  return {
    handleSearchResultPress,
    navigateToBook,
    navigateToChapter,
    navigateToVerse,
  };
};

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBibleNavigationStore } from '../store/bibleNavigationStore';
import { BibleBooksScreen } from '../screens/BibleBooksScreen';
import { BookChaptersScreen } from '../screens/BookChaptersScreen';
import { ChapterVersesScreen } from '../screens/ChapterVersesScreen';
import { useTheme } from '@/shared/hooks';

/**
 * Bible Container Component
 * Uses conditional rendering instead of navigation stack
 * This eliminates navigation context issues and provides better control
 */
export const BibleContainer: React.FC = () => {
  const { theme } = useTheme();
  const { currentScreen, selectedBook, selectedChapter } =
    useBibleNavigationStore();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });

  // Conditional rendering based on current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'books':
        return <BibleBooksScreen />;

      case 'chapters':
        if (!selectedBook) {
          // Fallback to books if no book is selected
          return <BibleBooksScreen />;
        }
        return <BookChaptersScreen />;

      case 'verses':
        if (!selectedBook || !selectedChapter) {
          // Fallback to books if no book/chapter is selected
          return <BibleBooksScreen />;
        }
        return <ChapterVersesScreen />;

      default:
        return <BibleBooksScreen />;
    }
  };

  return <View style={styles.container}>{renderCurrentScreen()}</View>;
};

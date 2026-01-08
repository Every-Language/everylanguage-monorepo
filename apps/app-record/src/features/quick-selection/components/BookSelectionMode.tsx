import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useBooks } from '@/features/bible/hooks/useBible';
import { useQuickSelectionStore } from '../store/quickSelectionStore';
import { useBookSearch } from '../hooks/useSearch';
import { SearchInput } from './SearchInput';
import { BookItem } from './BookItem';
import type { Book, BookWithMetadata } from '@/features/bible/types';

export const BookSelectionMode: React.FC = () => {
  const { theme } = useTheme();
  const { books, loading } = useBooks();
  const { searchQueries, setSearchQuery, clearSearch, selectBook } =
    useQuickSelectionStore();

  const currentSearchQuery = searchQueries.book;
  const filteredBooks = useBookSearch(books, currentSearchQuery);

  const handleSearchChange = (query: string) => {
    setSearchQuery('book', query);
  };

  const handleClearSearch = () => {
    clearSearch('book');
  };

  const handleBookSelect = (book: Book) => {
    // Convert Book to BookWithMetadata by adding chaptersCount
    const bookWithMetadata: BookWithMetadata = {
      ...book,
      chaptersCount: 0, // Will be populated by separate query if needed
    };
    selectBook(bookWithMetadata);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    list: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <SearchInput
        value={currentSearchQuery}
        onChangeText={handleSearchChange}
        placeholder='Search books...'
        onClear={handleClearSearch}
      />
      <FlatList
        style={styles.list}
        data={filteredBooks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BookItem book={item} onPress={() => handleBookSelect(item)} />
        )}
        refreshing={loading}
        // Add error handling if needed
      />
    </View>
  );
};

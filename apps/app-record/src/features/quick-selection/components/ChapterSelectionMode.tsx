import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useChaptersWithMetadata } from '@/features/bible/hooks/useChaptersWithMetadata';
import { useQuickSelectionStore } from '../store/quickSelectionStore';
import { useChapterSearch } from '../hooks/useSearch';
import { SearchInput } from './SearchInput';
import { ChapterItem } from './ChapterItem';
import type { BookWithMetadata } from '@/features/bible/types';

interface ChapterSelectionModeProps {
  book: BookWithMetadata;
}

export const ChapterSelectionMode: React.FC<ChapterSelectionModeProps> = ({
  book,
}) => {
  const { theme } = useTheme();
  const { chapters, loading } = useChaptersWithMetadata(book.id);
  const { searchQueries, setSearchQuery, clearSearch, selectChapter } =
    useQuickSelectionStore();

  const currentSearchQuery = searchQueries.chapter;
  const filteredChapters = useChapterSearch(chapters, currentSearchQuery);

  const handleSearchChange = (query: string) => {
    setSearchQuery('chapter', query);
  };

  const handleClearSearch = () => {
    clearSearch('chapter');
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
        placeholder={`Search chapters in ${book.name}...`}
        keyboardType='numeric'
        onClear={handleClearSearch}
      />
      <FlatList
        style={styles.list}
        data={filteredChapters}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChapterItem
            chapter={item}
            onPress={() => selectChapter(item)}
            bookName={book.name}
          />
        )}
        refreshing={loading}
        // Add error handling if needed
      />
    </View>
  );
};

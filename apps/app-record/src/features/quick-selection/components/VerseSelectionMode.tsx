import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useVersesPS } from '@/features/bible/hooks/useBible';
import { useQuickSelectionStore } from '../store/quickSelectionStore';
import { useVerseSearch } from '../hooks/useSearch';
import { SearchInput } from './SearchInput';
import { VerseItem } from './VerseItem';
import type {
  BookWithMetadata,
  ChapterWithMetadata,
} from '@/features/bible/types';

interface VerseSelectionModeProps {
  book: BookWithMetadata;
  chapter: ChapterWithMetadata;
}

export const VerseSelectionMode: React.FC<VerseSelectionModeProps> = ({
  book,
  chapter,
}) => {
  const { theme } = useTheme();
  const { verses, loading } = useVersesPS(chapter.id);
  const { searchQueries, setSearchQuery, clearSearch, selectVerse } =
    useQuickSelectionStore();

  const currentSearchQuery = searchQueries.verse;
  const filteredVerses = useVerseSearch(verses, currentSearchQuery);

  const handleSearchChange = (query: string) => {
    setSearchQuery('verse', query);
  };

  const handleClearSearch = () => {
    clearSearch('verse');
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
        placeholder={`Search verses in ${book.name} ${chapter.chapter_number}...`}
        keyboardType='numeric'
        onClear={handleClearSearch}
      />
      <FlatList
        style={styles.list}
        data={filteredVerses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <VerseItem
            verse={item}
            onPress={() => selectVerse(item)}
            bookName={book.name}
            chapterNumber={chapter.chapter_number}
          />
        )}
        refreshing={loading}
        // Add error handling if needed
      />
    </View>
  );
};

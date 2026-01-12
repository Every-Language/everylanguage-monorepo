import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { BookCard } from './BookCard';
import { BookCardSkeleton } from './skeletons';
import type { Book } from '../types';

interface BookListProps {
  books: Book[];
  selectedBook: Book | null;
  onBookSelect: (book: Book) => void;
  loading?: boolean;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  selectedBook: _selectedBook,
  onBookSelect,
  loading = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  // Create theme-aware styles
  const styles = StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    list: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 100, // Space for audio player
    },
    skeletonItem: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
  });

  if (loading) {
    const skeletonData = Array.from({ length: 10 }, (_, i) => ({
      id: `skeleton-${i}`,
    }));
    return (
      <FlatList
        data={skeletonData}
        renderItem={() => (
          <View style={styles.skeletonItem}>
            <BookCardSkeleton />
          </View>
        )}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('books.empty')}</Text>
      </View>
    );
  }

  const renderBook = ({ item }: { item: Book }) => (
    <BookCard book={item} onPress={() => onBookSelect(item)} />
  );

  return (
    <FlatList
      data={books}
      renderItem={renderBook}
      keyExtractor={item => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
};

// Styles moved inside component for theme access

import React, { useCallback } from 'react';
import { View, StyleSheet, RefreshControlProps } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useResponsiveGrid, BOOK_GRID_CONFIG } from '@/shared/utils/responsive';
import { BookCard } from './BookCard';
import { BookCardSkeleton } from './skeletons';
import type { Book } from '../types';
import { useMediaBottomInset } from '@/features/media/layout/useMediaBottomInset';

interface BookGridProps {
  books: Book[];
  selectedBook: Book | null;
  onBookSelect: (book: Book) => void;
  loading?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  selectedBook: _selectedBook,
  onBookSelect,
  loading = false,
  refreshControl,
}) => {
  const { numColumns } = useResponsiveGrid(BOOK_GRID_CONFIG);
  const bottomInset = useMediaBottomInset();

  const contentContainerStyle = {
    paddingHorizontal: BOOK_GRID_CONFIG.containerPadding / 2,
    paddingTop: BOOK_GRID_CONFIG.gap,
    paddingBottom: BOOK_GRID_CONFIG.gap,
  };

  // Create theme-aware styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    bookWrapper: {
      flex: 1, // Let FlashList handle width distribution
      marginHorizontal: BOOK_GRID_CONFIG.gap / 2, // Half gap on each side
      marginBottom: BOOK_GRID_CONFIG.gap,
    },
  });

  const renderBook = useCallback(
    ({ item }: { item: Book }) => {
      return (
        <View style={styles.bookWrapper}>
          <BookCard book={item} onPress={() => onBookSelect(item)} />
        </View>
      );
    },
    [onBookSelect, styles]
  );

  // Estimate item size for FlashList performance
  // Card aspect ratio 1.4 + footer + margin
  const CARD_ASPECT_RATIO = 1.4;
  const estimatedItemSize =
    BOOK_GRID_CONFIG.maxCardWidth / CARD_ASPECT_RATIO + 48 + 16; // image + footer + margin

  // Show skeleton placeholders while loading
  if (loading && books.length === 0) {
    const skeletonData = Array.from({ length: numColumns * 3 }, (_, i) => ({
      id: `skeleton-${i}`,
    }));
    return (
      <View style={styles.container}>
        <FlashList
          data={skeletonData}
          renderItem={() => (
            <View style={styles.bookWrapper}>
              <BookCardSkeleton />
            </View>
          )}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          estimatedItemSize={estimatedItemSize}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={true}
          scrollIndicatorInsets={{ bottom: bottomInset }}
          ListFooterComponent={<View style={{ height: bottomInset }} />}
          key={numColumns}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={books}
        renderItem={renderBook}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        estimatedItemSize={estimatedItemSize}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ bottom: bottomInset }}
        ListFooterComponent={<View style={{ height: bottomInset }} />}
        refreshControl={refreshControl}
        key={numColumns} // Force re-render when columns change
      />
    </View>
  );
};

// Styles moved inside component for theme access

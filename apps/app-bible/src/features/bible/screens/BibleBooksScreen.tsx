import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { GradientBackground } from '@everylanguage/shared-native-ui';
import { BookGrid } from '../components/BookGrid';
import { useBooks } from '../hooks/useBible';
import type { BookWithMetadata } from '../types';
import { useBibleNavigationV2 } from '../services/BibleNavigationServiceV2';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const BibleBooksScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { navigateToBook } = useBibleNavigationV2();

  // PowerSync TanStack Query hooks
  const {
    books = [],
    loading: booksLoading,
    error: booksError,
    refetch: refetchBooks,
  } = useBooks();

  const handleBookSelect = (book: BookWithMetadata) => {
    // Navigate to chapters screen using new store-based navigation
    navigateToBook(book);
  };

  const handleRefresh = async () => {
    try {
      refetchBooks();
    } catch (error: unknown) {
      logger.error(ENABLE_LOGGING, 'Failed to refresh books:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 8,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
      color: theme.colors.error,
    },
    retryButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    retryText: {
      textAlign: 'center',
      fontWeight: 'bold',
      color: theme.colors.textInverse,
    },
  });

  if (booksError) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t('books.errorLoading')}{' '}
            {String(booksError || t('errors.unknown'))}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleRefresh}>
            <Text style={[styles.retryText]}>{t('books.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <BookGrid
          books={books}
          selectedBook={null}
          onBookSelect={handleBookSelect}
          loading={booksLoading}
          refreshControl={
            <RefreshControl
              refreshing={booksLoading}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      </View>
    </GradientBackground>
  );
};

import React, { useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
// import { useNavigation } from '@react-navigation/native'; // No longer needed
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { ModalHeader } from '@/shared/components/ModalHeader';
import { SearchBar } from './SearchBar';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { RecentSearches } from './RecentSearches';
import { useSearch, useSearchHistory } from '../hooks';
import { logger } from '@/shared/utils/logger';
import type { SearchResult } from '../types';
import { createSearchResultPressHandler } from '../services/SearchNavigationService';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const {
    query,
    results,
    loading,
    filters,
    search,
    updateFilters,
    clearSearch,
  } = useSearch();

  const { recentSearches, addSearch, clearHistory } = useSearchHistory();

  const handleQueryChange = useCallback(
    (text: string) => {
      search(text);
    },
    [search]
  );

  const handleClear = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleResultPress = useCallback(
    (result: SearchResult) => {
      // Add to recent searches
      if (query.trim()) {
        addSearch(query.trim(), results.length);
      }

      // Navigate based on result type using SearchNavigationService
      try {
        const handler = createSearchResultPressHandler();
        handler(result);
      } catch (error) {
        logger.error(true, 'Navigation error:', error);
      }

      onClose();
    },
    [query, results.length, addSearch, onClose]
  );

  const handleRecentSearchSelect = useCallback(
    (searchQuery: string) => {
      search(searchQuery);
    },
    [search]
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
    },
  });

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ModalHeader title={t('search.title')} showClose onClose={onClose} />
      <View style={styles.content}>
        <SearchBar
          value={query}
          onChangeText={handleQueryChange}
          onClear={handleClear}
          loading={loading}
        />
        <SearchFilters filters={filters} onFilterChange={updateFilters} />
        {query.trim() ? (
          <SearchResults
            results={results}
            onResultPress={handleResultPress}
            loading={loading}
          />
        ) : (
          <RecentSearches
            searches={recentSearches}
            onSearchSelect={handleRecentSearchSelect}
            onClearHistory={clearHistory}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

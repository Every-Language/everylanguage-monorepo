import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { SearchResultItem } from './SearchResultItem';
import { SearchResultSkeleton } from './skeletons';
import { useSearchNavigation } from '../hooks/useSearchNavigation';
import type { SearchResult } from '../types';

interface SearchResultsProps {
  results: SearchResult[];
  onResultPress?: (result: SearchResult) => void; // Made optional since we'll use the hook
  loading?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onResultPress,
  loading = false,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { handleSearchResultPress } = useSearchNavigation();

  // Use the hook's navigation handler if no custom handler is provided
  const handleResultPress = onResultPress || handleSearchResultPress;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    resultsList: {
      flex: 1,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listContent: {
      paddingBottom: 16,
    },
  });

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        {t('search.noResults')}
      </Text>
      <Text style={styles.emptyMessage}>{t('search.noResultsMessage')}</Text>
    </View>
  );

  const getSectionTitle = (type: SearchResult['type']): string => {
    switch (type) {
      case 'book':
        return t('search.sections.books');
      case 'chapter':
        return t('search.sections.chapters');
      case 'verse':
        return t('search.sections.verses');
      default:
        return '';
    }
  };

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<SearchResult['type'], SearchResult[]>
  );

  const renderSection = (type: SearchResult['type'], items: SearchResult[]) => (
    <View key={type}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {getSectionTitle(type)} ({items.length})
        </Text>
      </View>
      {items.map(item => (
        <SearchResultItem
          key={item.id}
          result={item}
          onPress={() => handleResultPress(item)}
        />
      ))}
    </View>
  );

  if (loading) {
    const skeletonData = Array.from({ length: 5 }, (_, i) => ({
      id: `skeleton-${i}`,
    }));
    return (
      <View style={styles.container}>
        <FlatList
          style={styles.resultsList}
          data={skeletonData}
          keyExtractor={item => item.id}
          renderItem={() => <SearchResultSkeleton />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  if (results.length === 0) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.resultsList}
        data={Object.entries(groupedResults)}
        keyExtractor={([type]) => type}
        renderItem={({ item: [type, items] }) =>
          renderSection(type as SearchResult['type'], items)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

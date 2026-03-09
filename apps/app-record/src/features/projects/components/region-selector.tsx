import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '@/shared/hooks';
import { SearchBar } from '@/shared/ui';
import { RegionCard } from '@/features/languages/components';
import {
  useSearchRegions,
  type RegionSearchResult,
} from '@/features/languages/hooks';
import { getNetworkErrorMessage } from '@/shared/utils/networkErrors';

export interface RegionSelectorProps {
  title: string;
  onBack: () => void;
  onRegionSelect: (region: { region_id: string; region_name: string }) => void;
}

/**
 * Region Selector Component
 *
 * Reusable component for selecting regions with search functionality.
 */
export const RegionSelector: React.FC<RegionSelectorProps> = ({
  title,
  onBack,
  onRegionSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useSearchRegions(searchQuery, true);

  const renderItem = useCallback(
    ({ item }: { item: RegionSearchResult }) => (
      <RegionCard region={item} onPress={onRegionSelect} />
    ),
    [onRegionSelect]
  );

  const renderEmpty = (): React.ReactNode => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size='large' color={theme.colors.accent} />
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Searching...
          </Text>
        </View>
      );
    }

    if (error) {
      const isNetworkError =
        'isNetworkError' in error && error.isNetworkError === true;
      const errorMessage = getNetworkErrorMessage(error);

      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={isNetworkError ? 'cloud-offline' : 'alert-circle'}
            size={48}
            color={theme.colors.error}
          />
          <Text style={[styles.emptyText, { color: theme.colors.error }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={() => void refetch()}
            accessibilityLabel='Retry search'>
            <Ionicons
              name='refresh'
              size={16}
              color={theme.colors.textInverse}
            />
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      searchQuery.trim().length >= 2 &&
      (!searchResults || searchResults.length === 0)
    ) {
      return (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No regions found. Try a different search term.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {searchQuery.trim().length < 2
            ? 'Enter at least 2 characters to search'
            : 'Searching...'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      {...(Platform.OS === 'ios'
        ? { edges: ['bottom', 'left', 'right'] as const }
        : {})}
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
          onPress={onBack}
          accessibilityLabel={t('common.back')}>
          <Ionicons
            name='chevron-back'
            size={20}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder='Search regions...'
        autoFocus={true}
      />

      {/* Results List */}
      <FlatList
        data={searchQuery.trim().length >= 2 ? searchResults : []}
        renderItem={renderItem}
        keyExtractor={item => item.region_id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps='handled'
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

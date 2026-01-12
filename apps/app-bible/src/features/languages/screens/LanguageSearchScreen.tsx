import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useLanguageSearch } from '../hooks/useLanguageSearch';
// import { useVersionsStore } from '../store/versionsStore';
import type { LanguageSearchResult } from '../services/fuzzySearchService';
import type {
  LanguageSearchScreenProps,
  VersionSelectionStackNavigationProp,
} from '../navigation/VersionSelectionStackNavigator';
import { SearchResultItem } from '../components/SearchResultItem';
import { SearchResultSkeleton } from '../../search/components/skeletons';
//
import { StyleSheet } from 'react-native';
import { ModalHeader } from '@everylanguage/shared-native-ui';

export const LanguageSearchScreen: React.FC<LanguageSearchScreenProps> = ({
  route,
}) => {
  const { versionType } = route.params;
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<VersionSelectionStackNavigationProp>();
  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Card expansion removed in favor of navigation to VersionInfo screen
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Access store only if needed later; no destructuring to avoid unused vars
  // const versionsStore = useVersionsStore();

  const {
    isSearching,
    availableResults,
    unavailableResults,
    error: searchError,
    isLoadingPopular,
    popularResults,
    searchAudioVersions,
    searchTextVersions,
    fetchPopularVersions,
    clearResults,
  } = useLanguageSearch();

  const navigateToLanguage = useCallback(
    (language: LanguageSearchResult) => {
      navigation.navigate('LanguageInfo', {
        versionType,
        languageResult: language,
      });
    },
    [navigation, versionType]
  );

  const handleSearch = useCallback(() => {
    if (searchQuery.length < 2) {
      clearResults();
      setHasSearched(false);
      return;
    }

    setHasSearched(true);

    if (versionType === 'audio') {
      return searchAudioVersions(searchQuery);
    } else {
      return searchTextVersions(searchQuery);
    }
  }, [
    searchQuery,
    versionType,
    searchAudioVersions,
    searchTextVersions,
    clearResults,
  ]);

  const handleBackToVersions = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Focus input on mount and fetch popular versions
  useEffect(() => {
    // Focus the input after a small delay to ensure it's rendered
    const focusTimeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Fetch popular versions on mount
    fetchPopularVersions(versionType);

    return () => clearTimeout(focusTimeout);
  }, [versionType, fetchPopularVersions]);

  // Use handleSearch when searchQuery changes
  useEffect(() => {
    const cleanup = handleSearch();
    return cleanup || (() => {});
  }, [handleSearch]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <ModalHeader
        title={t('languages.search.header', { versionType })}
        showBack
        onBack={handleBackToVersions}
        showClose
        onClose={() => navigation.getParent()?.goBack()}
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View
          style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Ionicons
            name='search'
            size={18}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('languages.search.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize='none'
            autoCorrect={false}
            returnKeyType='search'
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {/* Error Message */}
      {searchError && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {searchError}
          </Text>
        </View>
      )}

      {/* Loading */}
      {isSearching && (
        <ScrollView style={styles.scrollView}>
          {Array.from({ length: 5 }).map((_, index) => (
            <SearchResultSkeleton key={`skeleton-${index}`} />
          ))}
        </ScrollView>
      )}

      {/* Results */}
      <ScrollView style={styles.scrollView}>
        {hasSearched && !isSearching && (
          <>
            {availableResults.map((result: LanguageSearchResult) => (
              <SearchResultItem
                key={String(result.entity_id)}
                result={result}
                onSelect={navigateToLanguage}
                versionType={versionType}
                isAvailable={true}
                isExpanded={false}
              />
            ))}

            {unavailableResults.map((result: LanguageSearchResult) => (
              <SearchResultItem
                key={result.entity_id}
                result={result}
                onSelect={() => {}}
                versionType={versionType}
                isAvailable={false}
              />
            ))}

            {availableResults.length === 0 &&
              unavailableResults.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme.colors.textSecondary },
                    ]}>
                    {t('languages.search.noLanguages', { query: searchQuery })}
                  </Text>
                </View>
              )}
          </>
        )}

        {/* Show popular versions when no search or query too short */}
        {!hasSearched && searchQuery.length < 2 && (
          <>
            {isLoadingPopular ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size='large' color={theme.colors.primary} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('languages.search.loadingPopular')}
                </Text>
              </View>
            ) : popularResults.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('languages.search.popularVersions', { versionType })}
                  </Text>
                </View>
                {popularResults.map((result: LanguageSearchResult) => (
                  <SearchResultItem
                    key={String(result.entity_id)}
                    result={result}
                    onSelect={navigateToLanguage}
                    versionType={versionType}
                    isAvailable={true}
                    isExpanded={false}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('languages.search.typeAtLeast')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  searchLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  // expanded versions are no longer used
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});

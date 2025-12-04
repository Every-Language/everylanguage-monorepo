import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import type { SearchFilters as SearchFiltersType } from '../types';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFilterChange: (filters: SearchFiltersType) => void;
}

const FILTER_TABS = [
  { key: 'all' as const, labelKey: 'search.filters.all' },
  { key: 'books' as const, labelKey: 'search.filters.books' },
  { key: 'chapters' as const, labelKey: 'search.filters.chapters' },
  { key: 'verses' as const, labelKey: 'search.filters.verses' },
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.text,
    },
    activeTabText: {
      color: theme.colors.textInverse,
    },
  });

  const handleTabPress = (type: SearchFiltersType['type']) => {
    onFilterChange({ ...filters, type });
  };

  return (
    <View style={styles.container}>
      {FILTER_TABS.map(tab => {
        const isActive = filters.type === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => handleTabPress(tab.key)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';

interface RecentSearchesProps {
  searches: string[];
  onSearchSelect: (query: string) => void;
  onClearHistory: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSearchSelect,
  onClearHistory,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: theme.colors.text,
    },
    clearButton: {
      padding: 4,
    },
    clearButtonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    searchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchText: {
      flex: 1,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
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
    listContent: {
      paddingBottom: 16,
    },
  });

  const renderSearchItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.searchItem}
      onPress={() => onSearchSelect(item)}
      activeOpacity={0.7}>
      <Ionicons
        name='time-outline'
        size={20}
        color={theme.colors.textSecondary}
        style={styles.searchIcon}
      />
      <Text style={styles.searchText}>{item}</Text>
    </TouchableOpacity>
  );

  if (searches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name='search-outline'
          size={48}
          color={theme.colors.textSecondary}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyTitle}>{t('search.startTyping')}</Text>
        <Text style={styles.emptyMessage}>
          {t('search.startTypingMessage')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('search.recentSearches')}</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClearHistory}
          activeOpacity={0.7}>
          <Text style={styles.clearButtonText}>{t('search.clearHistory')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={searches}
        keyExtractor={item => item}
        renderItem={renderSearchItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

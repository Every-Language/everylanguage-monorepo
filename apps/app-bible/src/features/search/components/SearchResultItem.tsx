import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { HighlightedText } from './HighlightedText';
import type { SearchResult } from '../types';

interface SearchResultItemProps {
  result: SearchResult;
  onPress: () => void;
}

const getIconName = (
  type: SearchResult['type']
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'book':
      return 'book-outline';
    case 'chapter':
      return 'document-text-outline';
    case 'verse':
      return 'create-outline';
    default:
      return 'search-outline';
  }
};

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  onPress,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginVertical: 2,
      borderRadius: 8,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    metadata: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={getIconName(result.type)}
          size={20}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {result.title}
        </Text>
        {result.subtitle && (
          <HighlightedText
            text={result.subtitle}
            style={styles.subtitle}
            numberOfLines={2}
          />
        )}
        {result.metadata && (
          <Text style={styles.metadata} numberOfLines={1}>
            {result.metadata}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

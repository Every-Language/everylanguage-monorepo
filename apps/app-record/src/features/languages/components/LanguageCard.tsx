import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { LanguageSearchResult } from '../hooks';

interface LanguageCardProps {
  language: LanguageSearchResult;
  onPress: (language: LanguageSearchResult) => void;
}

/**
 * LanguageCard Component
 *
 * Displays a language search result as a card with:
 * - Title: language name
 * - Subtitle: matched alias
 * - Regions list: comma-separated list of regions
 */
export const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  onPress,
}) => {
  const { theme } = useTheme();

  const handlePress = (): void => {
    onPress(language);
  };

  const regionsText =
    language.regions && language.regions.length > 0
      ? language.regions.map(r => r.region_name).join(', ')
      : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {language.entity_name}
        </Text>
        {language.alias_name !== language.entity_name && (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Matched: {language.alias_name}
          </Text>
        )}
        {regionsText && (
          <Text
            style={[styles.regions, { color: theme.colors.textSecondary }]}
            numberOfLines={2}>
            Regions: {regionsText}
          </Text>
        )}
      </View>
      <View style={styles.chevron}>
        <Text
          style={[styles.chevronText, { color: theme.colors.textSecondary }]}>
          ›
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  regions: {
    fontSize: 13,
    marginTop: 4,
  },
  chevron: {
    marginLeft: 12,
  },
  chevronText: {
    fontSize: 24,
  },
});

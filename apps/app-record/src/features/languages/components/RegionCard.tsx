import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { RegionSearchResult } from '../hooks';

interface RegionCardProps {
  region: RegionSearchResult;
  onPress: (region: RegionSearchResult) => void;
}

/**
 * RegionCard Component
 *
 * Displays a region search result as a card with:
 * - Title: region name
 * - Subtitle: matched alias
 * - Languages list: comma-separated list of languages
 */
export const RegionCard: React.FC<RegionCardProps> = ({ region, onPress }) => {
  const { theme } = useTheme();

  const handlePress = (): void => {
    onPress(region);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {region.region_name}
        </Text>
        {region.alias_name !== region.region_name && (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Matched: {region.alias_name}
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
  chevron: {
    marginLeft: 12,
  },
  chevronText: {
    fontSize: 24,
  },
});

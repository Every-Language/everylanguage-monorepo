import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { RegionStats } from '../hooks';

interface RegionStatsSectionProps {
  stats: RegionStats | null;
  isLoading: boolean;
}

/**
 * RegionStatsSection Component
 *
 * Displays region statistics including:
 * - Population
 * - Language count
 * - People groups count
 */
export const RegionStatsSection: React.FC<RegionStatsSectionProps> = ({
  stats,
  isLoading,
}) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading statistics...
        </Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Statistics not available
        </Text>
      </View>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Key Metrics */}
      <View style={styles.metricsRow}>
        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}>
          <Ionicons name='people' size={20} color={theme.colors.accent} />
          <Text
            style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Population
          </Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {formatNumber(stats.population)}
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}>
          <Ionicons name='language' size={20} color={theme.colors.accent} />
          <Text
            style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Languages
          </Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {stats.language_count || 0}
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}>
          <Ionicons
            name='people-circle'
            size={20}
            color={theme.colors.accent}
          />
          <Text
            style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            People Groups
          </Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {stats.people_group_count || 0}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});

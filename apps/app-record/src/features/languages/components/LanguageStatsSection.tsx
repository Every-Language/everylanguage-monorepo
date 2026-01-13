import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { LanguageStats } from '../hooks';

interface LanguageStatsSectionProps {
  stats: LanguageStats | null;
  isLoading: boolean;
}

/**
 * LanguageStatsSection Component
 *
 * Displays language statistics including:
 * - Population
 * - Country count
 * - People groups count
 * - Bible translation status (whole bible, NT, portions, Jesus Film, audio recordings)
 */
export const LanguageStatsSection: React.FC<LanguageStatsSectionProps> = ({
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
          <Ionicons name='globe' size={20} color={theme.colors.accent} />
          <Text
            style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
            Countries
          </Text>
          <Text style={[styles.metricValue, { color: theme.colors.text }]}>
            {stats.country_count || 0}
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

      {/* Bible Translation Status */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Bible Translation Status
        </Text>

        <View style={styles.statusGrid}>
          {/* Whole Bible */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: stats.has_whole_bible
                  ? theme.colors.surface
                  : theme.colors.surface,
                borderColor: stats.has_whole_bible
                  ? theme.colors.accent
                  : theme.colors.border,
              },
            ]}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: stats.has_whole_bible
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              Whole Bible
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: stats.has_whole_bible
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              {stats.has_whole_bible ? 'Yes' : 'No'}
            </Text>
            {stats.has_whole_bible && stats.bible_year && (
              <Text
                style={[
                  styles.statusYear,
                  { color: theme.colors.textSecondary },
                ]}>
                {stats.bible_year}
              </Text>
            )}
          </View>

          {/* New Testament */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: stats.has_new_testament
                  ? theme.colors.accent
                  : theme.colors.border,
              },
            ]}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: stats.has_new_testament
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              New Testament
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: stats.has_new_testament
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              {stats.has_new_testament ? 'Yes' : 'No'}
            </Text>
            {stats.has_new_testament && stats.nt_year && (
              <Text
                style={[
                  styles.statusYear,
                  { color: theme.colors.textSecondary },
                ]}>
                {stats.nt_year}
              </Text>
            )}
          </View>

          {/* Portions */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: stats.has_portions
                  ? theme.colors.accent
                  : theme.colors.border,
              },
            ]}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: stats.has_portions
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              Portions
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: stats.has_portions
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              {stats.has_portions ? 'Yes' : 'No'}
            </Text>
            {stats.has_portions && stats.portions_year && (
              <Text
                style={[
                  styles.statusYear,
                  { color: theme.colors.textSecondary },
                ]}>
                {stats.portions_year}
              </Text>
            )}
          </View>

          {/* Jesus Film */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: stats.has_jesus_film
                  ? theme.colors.accent
                  : theme.colors.border,
              },
            ]}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: stats.has_jesus_film
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              Jesus Film
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: stats.has_jesus_film
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              {stats.has_jesus_film ? 'Yes' : 'No'}
            </Text>
          </View>

          {/* Audio Recordings */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: stats.has_audio_recordings
                  ? theme.colors.accent
                  : theme.colors.border,
              },
            ]}>
            <Text
              style={[
                styles.statusLabel,
                {
                  color: stats.has_audio_recordings
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              Audio Recordings
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: stats.has_audio_recordings
                    ? theme.colors.accent
                    : theme.colors.textSecondary,
                },
              ]}>
              {stats.has_audio_recordings ? 'Yes' : 'No'}
            </Text>
          </View>
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
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusYear: {
    fontSize: 11,
    marginTop: 4,
  },
});

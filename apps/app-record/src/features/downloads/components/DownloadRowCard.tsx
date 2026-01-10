import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';

interface DownloadRowCardProps {
  chapterRef: string;
  status: string;
  progress?: number | null;
  versionName?: string | null;
}

export const DownloadRowCard: React.FC<DownloadRowCardProps> = ({
  chapterRef,
  status,
  progress,
  versionName,
}) => {
  const { theme } = useTheme();

  const pct = progress ? Math.round(progress * 100) : 0;
  const isActive = status === 'active';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View style={styles.cardLeft}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          {chapterRef}
        </Text>
        {versionName && (
          <Text
            style={[
              styles.cardVersionName,
              { color: theme.colors.textSecondary },
            ]}>
            {versionName}
          </Text>
        )}
        <Text
          style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
          {isActive ? `Downloading ${pct}%` : 'Queued'}
        </Text>
      </View>
      {isActive ? (
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.colors.border },
          ]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.colors.primary, width: `${pct}%` },
            ]}
          />
        </View>
      ) : (
        <View
          style={[styles.queuedDot, { backgroundColor: theme.colors.border }]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardVersionName: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    width: 80,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  queuedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { TempSegment } from '../types';
import { SegmentAudioPlayer } from './SegmentAudioPlayer';

export interface TempSegmentsListProps {
  segments: TempSegment[];
}

/**
 * Temp Segments List Component
 *
 * Displays list of temporary segments with hide/show controls and audio playback
 */
export const TempSegmentsList: React.FC<TempSegmentsListProps> = ({
  segments,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.segmentsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Segments ({segments.length})
      </Text>
      {segments.map(segment => (
        <SegmentAudioPlayer key={segment.id} segment={segment} />
      ))}
      {segments.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          No segments yet. Start recording to generate segments.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  segmentsContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

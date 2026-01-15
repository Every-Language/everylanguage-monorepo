import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { TempSegment } from '../types';

export interface TempSegmentsListProps {
  segments: TempSegment[];
  recordingMode: 'recording' | 'edit';
  onToggleHide: (segmentId: string) => void;
}

/**
 * Format duration in seconds to MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Temp Segments List Component
 *
 * Displays list of temporary segments with hide/show controls
 */
export const TempSegmentsList: React.FC<TempSegmentsListProps> = ({
  segments,
  recordingMode,
  onToggleHide,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.segmentsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Segments ({segments.length})
      </Text>
      {segments.map(segment => {
        const isHidden = segment.is_hidden;
        return (
          <View
            key={segment.id}
            style={[
              styles.segmentItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              isHidden && styles.segmentItemHidden,
            ]}>
            <View style={styles.segmentInfo}>
              <Text style={[styles.segmentIndex, { color: theme.colors.text }]}>
                #{segment.segment_index}
              </Text>
              <Text
                style={[styles.segmentDuration, { color: theme.colors.text }]}>
                {formatDuration(segment.duration_seconds)}
              </Text>
              <Text
                style={[
                  styles.segmentLevel,
                  { color: theme.colors.textSecondary },
                ]}>
                Level: {segment.audio_level.toFixed(2)}
              </Text>
            </View>
            {recordingMode === 'edit' &&
              (() => {
                const hideButtonStyle = {
                  backgroundColor: isHidden
                    ? theme.colors.accent
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                };
                const hideButtonIconColor = isHidden
                  ? theme.colors.textInverse
                  : theme.colors.text;
                return (
                  <TouchableOpacity
                    style={[styles.hideButton, hideButtonStyle]}
                    onPress={() => onToggleHide(segment.id)}>
                    <Ionicons
                      name={isHidden ? 'eye' : 'eye-off'}
                      size={18}
                      color={hideButtonIconColor}
                    />
                  </TouchableOpacity>
                );
              })()}
          </View>
        );
      })}
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
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  segmentItemHidden: {
    opacity: 0.5,
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmentIndex: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentDuration: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentLevel: {
    fontSize: 12,
  },
  hideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});

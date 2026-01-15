import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { Segment } from '../hooks';

export interface SegmentCardProps {
  segment: Segment;
  onEdit?: () => void;
  onPlay?: () => void;
  isPlaying?: boolean;
}

/**
 * Segment Card Component
 *
 * Displays a segment with edit and play buttons.
 * Shows segment index and duration.
 */
export const SegmentCard = React.memo<SegmentCardProps>(
  ({ segment, onEdit, onPlay, isPlaying = false }) => {
    const { theme } = useTheme();

    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}>
        <View style={styles.content}>
          <View style={styles.info}>
            <Text style={[styles.index, { color: theme.colors.textSecondary }]}>
              #{segment.segment_index + 1}
            </Text>
            <Text style={[styles.duration, { color: theme.colors.text }]}>
              {formatDuration(segment.duration_seconds || 0)}
            </Text>
          </View>

          <View style={styles.actions}>
            {onPlay && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.accent,
                  },
                ]}
                onPress={onPlay}
                accessibilityLabel='Play segment'
                accessibilityRole='button'>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color={theme.colors.textInverse}
                />
              </TouchableOpacity>
            )}

            {onEdit && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={onEdit}
                accessibilityLabel='Edit segment'
                accessibilityRole='button'>
                <Ionicons name='pencil' size={18} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }
);

SegmentCard.displayName = 'SegmentCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  index: {
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

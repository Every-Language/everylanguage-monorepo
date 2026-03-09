import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { TempSegment } from '../types';
import { SegmentAudioPlayer } from './segment-audio-player';

export interface TempSegmentsListProps {
  segments: TempSegment[];
  isRecording?: boolean;
  hasActiveSegment?: boolean;
  activeSegmentId?: string | null;
  durationMs?: number;
  activeSegmentStartTimeMs?: number | null;
}

/**
 * Temp Segments List Component
 *
 * Displays list of temporary segments with hide/show controls and audio playback
 */
export const TempSegmentsList: React.FC<TempSegmentsListProps> = ({
  segments,
  isRecording = false,
  hasActiveSegment = false,
  activeSegmentId = null,
  durationMs = 0,
  activeSegmentStartTimeMs = null,
}) => {
  const { theme } = useTheme();

  // Check if active segment is already in the segments list
  const activeSegmentInList = activeSegmentId
    ? segments.some(s => s.id === activeSegmentId)
    : false;

  // Only show shadow segment if there's an active segment that's not yet in the list
  const shouldShowShadow =
    hasActiveSegment && activeSegmentId && !activeSegmentInList;

  return (
    <View style={styles.segmentsContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Segments ({segments.length + (shouldShowShadow ? 1 : 0)})
      </Text>
      {segments.map(segment => {
        // Calculate live duration if this is the active segment
        const isActiveSegment =
          hasActiveSegment && segment.id === activeSegmentId;
        const liveDurationMs =
          isActiveSegment && activeSegmentStartTimeMs !== null
            ? durationMs - activeSegmentStartTimeMs
            : undefined;

        return (
          <SegmentAudioPlayer
            key={segment.id}
            segment={segment}
            isDisabled={isRecording}
            isActive={isActiveSegment}
            {...(liveDurationMs !== undefined && { liveDurationMs })}
          />
        );
      })}
      {shouldShowShadow && activeSegmentStartTimeMs !== null && (
        <SegmentAudioPlayer
          segment={{
            id: activeSegmentId!,
            sequence_id: '',
            project_id: null,
            segment_index: segments.length + 1,
            start_time_ms: activeSegmentStartTimeMs,
            end_time_ms: 0,
            duration_seconds: 0,
            recording_status: 'recording',
            local_file_path: '',
            is_hidden: false,
            audio_level: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          isDisabled={true}
          isActive={true}
          isShadow={true}
          liveDurationMs={durationMs - activeSegmentStartTimeMs}
        />
      )}
      {segments.length === 0 && !hasActiveSegment && (
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

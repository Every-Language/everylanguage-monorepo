import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { useProgress as useTrackProgress } from 'react-native-track-player';
import { useCurrentTrack } from '../../store/PlaybackStore';
import {
  formatSeconds,
  calculateEffectiveDuration,
} from '../../utils/timeUtils';
// Track progress interval used only in this component
const TRACK_PROGRESS_INTERVAL = 250;

// No props needed - component is self-contained
type TimeDisplayProps = Record<string, never>;

export const TimeDisplay: React.FC<TimeDisplayProps> = React.memo(
  function TimeDisplay() {
    const { theme } = useTheme();

    // Get data directly from hooks
    const { position, duration } = useTrackProgress(TRACK_PROGRESS_INTERVAL);
    const currentTrack = useCurrentTrack();

    // Calculate effective duration and format times
    const effectiveDuration = useMemo(() => {
      return calculateEffectiveDuration(duration, currentTrack?.duration);
    }, [duration, currentTrack?.duration]);

    // VERSE RANGE NORMALIZATION: When playing a verse range (playlist item),
    // we need to show position/duration relative to the range, not the full chapter
    const normalizedPosition = useMemo(() => {
      if (
        currentTrack?.isVerseRange &&
        typeof currentTrack.verseRangeStartTime === 'number'
      ) {
        return Math.max(0, position - currentTrack.verseRangeStartTime);
      }
      return position;
    }, [
      position,
      currentTrack?.isVerseRange,
      currentTrack?.verseRangeStartTime,
    ]);

    const normalizedDuration = useMemo(() => {
      if (
        currentTrack?.isVerseRange &&
        typeof currentTrack.verseRangeStartTime === 'number' &&
        typeof currentTrack.verseRangeEndTime === 'number'
      ) {
        return (
          currentTrack.verseRangeEndTime - currentTrack.verseRangeStartTime
        );
      }
      return effectiveDuration;
    }, [
      effectiveDuration,
      currentTrack?.isVerseRange,
      currentTrack?.verseRangeStartTime,
      currentTrack?.verseRangeEndTime,
    ]);

    const positionFormatted = formatSeconds(normalizedPosition);
    const durationFormatted = formatSeconds(normalizedDuration);

    return (
      <View style={styles.timeDisplayContainer}>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          {positionFormatted}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          {durationFormatted}
        </Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  timeDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

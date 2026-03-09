import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { Segment } from '../hooks';
import type { TempSegment } from '../types';

/**
 * Segment with optional duration for MediaPlayer
 * Database segments don't have duration_seconds, but TempSegments do
 */
type SegmentWithDuration =
  | Segment
  | (Segment & { duration_seconds?: number })
  | TempSegment;

export interface MediaPlayerProps {
  segments: SegmentWithDuration[];
  onSegmentChange?: (segmentId: string) => void;
}

/**
 * Media Player Component
 *
 * Plays all segments in sequence order with seek bar divided by segments.
 * Supports skip backward 5s, skip forward 10s controls.
 */
export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  segments,
  onSegmentChange,
}) => {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [, setCurrentSegmentIndex] = useState(0); // Used in handleSeek but not read elsewhere

  /**
   * Get duration from segment, handling both Segment and TempSegment types
   */
  const getSegmentDuration = (seg: SegmentWithDuration): number => {
    if ('duration_seconds' in seg && typeof seg.duration_seconds === 'number') {
      return seg.duration_seconds;
    }
    // Database segments don't have duration_seconds - would need to calculate from audio file
    // For now, return 0 as fallback
    return 0;
  };

  // Calculate total duration from segments
  useEffect(() => {
    const total = segments.reduce((sum, seg) => {
      return sum + getSegmentDuration(seg);
    }, 0);
    setTotalDuration(total);
  }, [segments]);

  const handlePlayPause = (): void => {
    // TODO: Implement actual playback with @siteed/expo-audio-studio
    setIsPlaying(!isPlaying);
  };

  const handleSkipBackward = (): void => {
    // Skip backward 5 seconds
    const newPosition = Math.max(0, currentPosition - 5);
    setCurrentPosition(newPosition);
    // TODO: Update audio position
  };

  const handleSkipForward = (): void => {
    // Skip forward 10 seconds
    const newPosition = Math.min(totalDuration, currentPosition + 10);
    setCurrentPosition(newPosition);
    // TODO: Update audio position
  };

  const handleSeek = (value: number): void => {
    setCurrentPosition(value);
    // TODO: Seek audio to position
    // Determine which segment we're in
    let accumulated = 0;
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;
      const segmentDuration = getSegmentDuration(segment);
      if (value <= accumulated + segmentDuration) {
        setCurrentSegmentIndex(i);
        if (onSegmentChange) {
          onSegmentChange(segment.id);
        }
        break;
      }
      accumulated += segmentDuration;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate segment boundaries for seek bar
  const segmentBoundaries = segments.reduce(
    (acc, segment, index) => {
      if (!segment) return acc;
      const duration = getSegmentDuration(segment);
      const lastBoundary = acc.length > 0 ? acc[acc.length - 1] : null;
      const start = lastBoundary ? lastBoundary.end : 0;
      acc.push({
        segmentId: segment.id,
        start,
        end: start + duration,
        index,
      });
      return acc;
    },
    [] as Array<{
      segmentId: string;
      start: number;
      end: number;
      index: number;
    }>
  );

  if (segments.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}>
      {/* Seek Bar */}
      <View style={styles.seekBarContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={totalDuration}
          value={currentPosition}
          onValueChange={handleSeek}
          minimumTrackTintColor={theme.colors.accent}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.accent}
        />
        {/* Segment dividers */}
        <View style={styles.segmentDividers}>
          {segmentBoundaries.slice(1).map(boundary => {
            if (!boundary || totalDuration === 0) return null;
            const leftPercent = (boundary.start / totalDuration) * 100;
            return (
              <View
                key={boundary.segmentId}
                style={[
                  styles.segmentDivider,
                  {
                    left: `${leftPercent}%`,
                    backgroundColor: theme.colors.border,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Time Display */}
      <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          {formatTime(currentPosition)}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
          {formatTime(totalDuration)}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleSkipBackward}
          accessibilityLabel='Skip backward 5 seconds'
          accessibilityRole='button'>
          <Ionicons name='play-skip-back' size={24} color={theme.colors.text} />
          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>
            5s
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.playButton,
            {
              backgroundColor: theme.colors.accent,
            },
          ]}
          onPress={handlePlayPause}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole='button'>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color={theme.colors.textInverse}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleSkipForward}
          accessibilityLabel='Skip forward 10 seconds'
          accessibilityRole='button'>
          <Ionicons
            name='play-skip-forward'
            size={24}
            color={theme.colors.text}
          />
          <Text style={[styles.controlLabel, { color: theme.colors.text }]}>
            10s
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seekBarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  segmentDividers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: 'none',
  },
  segmentDivider: {
    position: 'absolute',
    width: 1,
    height: '100%',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

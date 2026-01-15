import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Slider } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import type { Segment } from '../hooks';

export interface MediaPlayerProps {
  segments: Segment[];
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
  // TODO: Use currentSegmentIndex when implementing segment navigation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  // Calculate total duration from segments
  useEffect(() => {
    const total = segments.reduce((sum, seg) => {
      return sum + (seg.duration_seconds || 0);
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
      const segmentDuration = segments[i].duration_seconds || 0;
      if (value <= accumulated + segmentDuration) {
        setCurrentSegmentIndex(i);
        if (onSegmentChange) {
          onSegmentChange(segments[i].id);
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
      const duration = segment.duration_seconds || 0;
      const start = acc.length > 0 ? acc[acc.length - 1].end : 0;
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
          {segmentBoundaries.slice(1).map(boundary => (
            <View
              key={boundary.segmentId}
              style={[
                styles.segmentDivider,
                {
                  left: `${(boundary.start / totalDuration) * 100}%`,
                  backgroundColor: theme.colors.border,
                },
              ]}
            />
          ))}
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

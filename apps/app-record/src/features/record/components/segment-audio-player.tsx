import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { FilePathService } from '../services/file-path-service';
import { AudioService } from '../services/audio-service';
import type { Segment, TempSegment } from '../types';

/**
 * Format duration in seconds to MM:SS
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Segment Audio Player Component
 *
 * Handles audio playback for a single segment
 */
export interface SegmentAudioPlayerProps {
  segment: Segment | TempSegment;
  isDisabled?: boolean;
  isActive?: boolean;
  isShadow?: boolean;
}

export const SegmentAudioPlayer: React.FC<SegmentAudioPlayerProps> = ({
  segment,
  isDisabled = false,
  isActive = false,
  isShadow = false,
}) => {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  // Animated value for background color transition
  const backgroundColorAnim = useRef(
    new Animated.Value(isActive || isShadow ? 1 : 0)
  ).current;

  // Determine the file path based on segment type
  // TempSegment has local_file_path, Segment (from PowerSync) has object_key
  const getFilePath = (): string | null => {
    if ('local_file_path' in segment) {
      // TempSegment
      return segment.local_file_path;
    }
    // Segment from PowerSync - check for object_key
    const segmentWithKey = segment as { object_key?: string };
    if (segmentWithKey.object_key) {
      return segmentWithKey.object_key;
    }
    return null;
  };

  const filePath = getFilePath();

  // Extract duration from audio file when component mounts or file path changes
  useEffect(() => {
    const loadDuration = async (): Promise<void> => {
      if (!filePath || duration > 0) {
        return; // Skip if no file path or duration already loaded
      }

      const fileDuration = await AudioService.extractDuration(filePath);
      if (fileDuration !== null) {
        setDuration(fileDuration);
      }
    };

    loadDuration();
  }, [filePath, duration]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {
          // Ignore errors during cleanup
        });
      }
    };
  }, []);

  const handlePlayPause = async (): Promise<void> => {
    if (isDisabled) {
      return;
    }
    try {
      if (soundRef.current) {
        // If sound is already loaded, toggle play/pause
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        // Load and play the audio file
        setIsLoading(true);
        setError(null);

        if (!filePath) {
          setError('Audio file path not available');
          setIsLoading(false);
          return;
        }

        const absolutePath = FilePathService.getAbsolutePath(filePath);

        // Check if file exists
        const fileExists = await FilePathService.fileExists(filePath);

        if (!fileExists) {
          // Additional check: verify the directory exists
          const sequenceDir = filePath.split('/').slice(0, -1).join('/');
          const absoluteSequenceDir =
            FilePathService.getAbsolutePath(sequenceDir);
          const dirInfo = await FileSystem.getInfoAsync(absoluteSequenceDir);

          // eslint-disable-next-line no-console
          console.error('Audio file not found:', {
            relativePath: filePath,
            absolutePath,
            sequenceDir: absoluteSequenceDir,
            dirExists: dirInfo.exists,
            segmentId: segment.id,
            segmentType:
              'local_file_path' in segment ? 'TempSegment' : 'Segment',
          });
          setError(
            `Audio file not found. The file may not have been created yet.`
          );
          setIsLoading(false);
          return;
        }

        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Ensure URI format is correct for Expo Audio
        // Expo Audio expects file:// URIs on some platforms
        const audioUri = absolutePath.startsWith('file://')
          ? absolutePath
          : `file://${absolutePath}`;

        // Load the sound
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );

        soundRef.current = sound;
        setIsPlaying(true);
        setIsLoading(false);

        // Get initial duration
        const initialStatus = await sound.getStatusAsync();
        if (
          initialStatus.isLoaded &&
          initialStatus.durationMillis !== undefined
        ) {
          setDuration(initialStatus.durationMillis / 1000);
        }

        // Handle playback status updates
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            // Update current position
            if (status.positionMillis !== undefined) {
              setCurrentPosition(status.positionMillis / 1000);
            }
            // Update duration if available
            if (status.durationMillis !== undefined) {
              setDuration(status.durationMillis / 1000);
            }
            // Handle playback finish
            if (status.didJustFinish) {
              setIsPlaying(false);
              setCurrentPosition(0);
            }
          }
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleSeek = async (value: number): Promise<void> => {
    if (isDisabled) {
      return;
    }
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          // Clamp value to valid range
          const clampedValue = Math.max(0, Math.min(value, displayDuration));
          await soundRef.current.setPositionAsync(clampedValue * 1000);
          // Position will be updated by onPlaybackStatusUpdate callback
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error seeking audio:', err);
    }
  };

  // Get fallback duration from segment if available, otherwise use 0
  const fallbackDuration =
    'duration_seconds' in segment
      ? (segment as TempSegment).duration_seconds
      : 0;
  const displayDuration = duration > 0 ? duration : fallbackDuration;

  // Animate background color transition
  useEffect(() => {
    Animated.timing(backgroundColorAnim, {
      toValue: isActive || isShadow ? 1 : 0,
      duration: 300, // 300ms fade transition
      useNativeDriver: false, // backgroundColor doesn't support native driver
    }).start();
  }, [isActive, isShadow, backgroundColorAnim]);

  // Interpolate background color between surface and success
  const backgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surface, theme.colors.success],
  });

  return (
    <Animated.View
      style={[
        styles.audioPlayerContainer,
        {
          backgroundColor,
        },
      ]}>
      {!isDisabled && (
        <TouchableOpacity
          style={[
            styles.playButton,
            {
              backgroundColor: theme.colors.accent,
            },
          ]}
          onPress={handlePlayPause}
          disabled={isLoading || !!error}
          accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
          accessibilityRole='button'>
          {isLoading ? (
            <ActivityIndicator size='small' color={theme.colors.textInverse} />
          ) : error ? (
            <Ionicons
              name='alert-circle'
              size={20}
              color={theme.colors.error}
            />
          ) : isPlaying ? (
            <Ionicons name='pause' size={20} color={theme.colors.textInverse} />
          ) : (
            <Ionicons name='play' size={20} color={theme.colors.textInverse} />
          )}
        </TouchableOpacity>
      )}
      {!isDisabled && (
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={displayDuration}
            value={currentPosition}
            onValueChange={handleSeek}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
            disabled={isLoading || !!error || !soundRef.current}
          />
        </View>
      )}
      <Text
        style={[
          styles.durationText,
          {
            color:
              isActive || isShadow
                ? theme.colors.textInverse
                : theme.colors.textSecondary,
            textAlign: isDisabled ? 'center' : 'right',
            flex: isDisabled ? 1 : 0,
          },
        ]}>
        {formatDuration(currentPosition || displayDuration)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  durationText: {
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
});

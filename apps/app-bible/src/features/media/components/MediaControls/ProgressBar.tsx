import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { View as RNView } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useProgress as useTrackProgress } from 'react-native-track-player';
import { calculateEffectiveDuration } from '../../utils/timeUtils';
import { SPACING, PROGRESS_BAR } from '../../constants';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Animation constants used only in this component
const ANIMATION_TIMING = {
  DISPLAY_UPDATE_THROTTLE_MS: 80,
  PROGRESS_ANIMATION_DURATION: 250,
  POSITION_TOLERANCE: 0.5,
} as const;

// Track progress interval used only in this component
const TRACK_PROGRESS_INTERVAL = 250;

// No props needed - component is self-contained
type ProgressBarProps = Record<string, never>;

export const ProgressBar: React.FC<ProgressBarProps> = React.memo(
  function ProgressBar() {
    const { theme } = useTheme();

    // Get data directly from hooks
    const { position, duration } = useTrackProgress(TRACK_PROGRESS_INTERVAL);
    const currentTrack = useCurrentTrack();

    // Use extracted utility for effective duration calculation
    const effectiveDuration = useMemo(() => {
      return calculateEffectiveDuration(duration, currentTrack?.duration);
    }, [duration, currentTrack?.duration]);

    // ✨ VERSE RANGE NORMALIZATION: When playing a verse range (playlist item),
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

    // Seeking function with verse range compensation
    const onSeek = useCallback(
      async (normalizedSeekPosition: number) => {
        try {
          // ✨ VERSE RANGE COMPENSATION: If playing a verse range,
          // add the start offset to get the absolute position in the file
          const absoluteSeekTime =
            currentTrack?.isVerseRange &&
            typeof currentTrack.verseRangeStartTime === 'number'
              ? normalizedSeekPosition + currentTrack.verseRangeStartTime
              : normalizedSeekPosition;

          const { getPlaybackStore } = await import(
            '../../store/PlaybackStore'
          );
          await getPlaybackStore().seekTo(absoluteSeekTime);
        } catch (error) {
          logger.error(ENABLE_LOGGING, 'Error seeking to position:', error);
        }
      },
      [currentTrack?.isVerseRange, currentTrack?.verseRangeStartTime]
    );

    const baseWidthRef = useRef(0);
    const progressBarRef = useRef<RNView>(null);

    // Seek head dragging - absolute positioning approach
    const dragPosition = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const progressBarLayout = useSharedValue({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
    const dragTimeSeconds = useSharedValue(0);
    const progressPct = useSharedValue(0);
    const normalizedDurationShared = useSharedValue(0);
    // Throttle UI→JS updates during dragging to avoid saturating JS thread
    const lastDisplayedUpdateTs = useSharedValue(0);

    // Pre-measure layout to avoid race conditions
    const measureLayout = useCallback(() => {
      progressBarRef.current?.measureInWindow((x, y, width, height) => {
        progressBarLayout.value = { x, y, width, height };
      });
    }, [progressBarLayout]);

    // State for real-time time display during dragging
    const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);
    const [targetSeekPosition, setTargetSeekPosition] = useState<number | null>(
      null
    );

    // Reset displayed times to actual values
    const resetDisplayedTimes = useCallback(() => {
      setIsCurrentlyDragging(false);
      setTargetSeekPosition(null);
    }, []);

    // Reset drag state for gesture cancellation recovery
    const resetDragState = useCallback(() => {
      // Reset all dragging state
      isDragging.value = false;
      setIsCurrentlyDragging(false);
      setTargetSeekPosition(null);

      // Use the current normalized position from useTrackProgress (real-time updates every 250ms)
      const currentPct =
        normalizedDuration > 0
          ? (normalizedPosition / normalizedDuration) * 100
          : 0;
      progressPct.value = withTiming(Math.max(0, Math.min(100, currentPct)), {
        duration: ANIMATION_TIMING.PROGRESS_ANIMATION_DURATION,
      });

      // Clear drag values
      dragPosition.value = 0;
      dragTimeSeconds.value = 0;
    }, [
      normalizedPosition,
      normalizedDuration,
      progressPct,
      isDragging,
      dragPosition,
      dragTimeSeconds,
    ]);

    // Keep normalized duration shared value in sync
    useEffect(() => {
      normalizedDurationShared.value = normalizedDuration;
    }, [normalizedDuration, normalizedDurationShared]);

    // Check if actual position has caught up to target seek position
    useEffect(() => {
      if (targetSeekPosition !== null && !isCurrentlyDragging) {
        const positionDiff = Math.abs(position - targetSeekPosition);

        if (positionDiff <= ANIMATION_TIMING.POSITION_TOLERANCE) {
          // Position has caught up to target, safe to reset pin and resume live updates
          isDragging.value = false;
          dragPosition.value = 0;
          dragTimeSeconds.value = 0;
          setTargetSeekPosition(null);
          resetDisplayedTimes();
        }
      }
    }, [
      position,
      targetSeekPosition,
      isCurrentlyDragging,
      resetDisplayedTimes,
      dragPosition,
      dragTimeSeconds,
      isDragging,
    ]);

    // Keep a shared value in sync with TrackPlayer progress for smooth UI-thread updates
    // Using normalized position/duration for verse ranges
    useEffect(() => {
      if (isCurrentlyDragging) return;
      if (
        targetSeekPosition !== null &&
        Math.abs(position - targetSeekPosition) >
          ANIMATION_TIMING.POSITION_TOLERANCE
      ) {
        // Pin UI to dropped position until player catches up
        return;
      }
      const pct =
        normalizedDuration > 0
          ? (normalizedPosition / normalizedDuration) * 100
          : 0;
      progressPct.value = withTiming(Math.max(0, Math.min(100, pct)), {
        duration: ANIMATION_TIMING.PROGRESS_ANIMATION_DURATION,
      });
    }, [
      position,
      normalizedPosition,
      normalizedDuration,
      isCurrentlyDragging,
      targetSeekPosition,
      progressPct,
    ]);

    const onSeekStart = () => {
      isDragging.value = true;
      setIsCurrentlyDragging(true);

      // Use pre-measured layout to avoid race conditions
      measureLayout();
    };

    const onSeekEnd = async (newTimeSeconds: number) => {
      // Clamp to normalized range
      const clampedNormalizedTime = Math.max(
        0,
        Math.min(normalizedDuration, newTimeSeconds)
      );

      // ✨ VERSE RANGE COMPENSATION: If playing a verse range,
      // add the start offset to get the absolute position in the file
      const absoluteSeekTime =
        currentTrack?.isVerseRange &&
        typeof currentTrack.verseRangeStartTime === 'number'
          ? clampedNormalizedTime + currentTrack.verseRangeStartTime
          : clampedNormalizedTime;

      // Exit drag mode and pin UI to dropped position until player catches up
      isDragging.value = false;
      setIsCurrentlyDragging(false);
      setTargetSeekPosition(absoluteSeekTime);
      const pct =
        normalizedDuration > 0
          ? (clampedNormalizedTime / normalizedDuration) * 100
          : 0;
      progressPct.value = Math.max(0, Math.min(100, pct));

      // Seek player with error handling (using normalized position)
      try {
        await onSeek(clampedNormalizedTime);
      } catch (error) {
        logger.error(
          ENABLE_LOGGING,
          'Seek failed, resetting to current position:',
          error
        );
        // Reset to current position on seek failure
        resetDragState();
      }
    };

    const seekHeadPan = Gesture.Pan()
      .hitSlop(SPACING.HIT_SLOP)
      .onBegin(e => {
        runOnJS(onSeekStart)();

        // Store the initial absolute position within the progress bar
        const relativeX = Math.max(
          0,
          Math.min(
            progressBarLayout.value.width,
            e.absoluteX - progressBarLayout.value.x
          )
        );
        dragPosition.value = relativeX;

        // Store initial drag time for real-time display (using normalized duration)
        const progressRatio = relativeX / progressBarLayout.value.width;
        dragTimeSeconds.value = progressRatio * normalizedDurationShared.value;

        // Update time display immediately
        lastDisplayedUpdateTs.value = Date.now();
      })
      .onUpdate(e => {
        if (!isDragging.value) return;
        if (progressBarLayout.value.width <= 0) return;

        // Calculate absolute position within the progress bar bounds
        const relativeX = Math.max(
          0,
          Math.min(
            progressBarLayout.value.width,
            e.absoluteX - progressBarLayout.value.x
          )
        );
        dragPosition.value = relativeX;

        // Calculate and store the drag time for real-time display (using normalized duration)
        const progressRatio = relativeX / progressBarLayout.value.width;
        dragTimeSeconds.value = progressRatio * normalizedDurationShared.value;

        // Throttled time display updates in real-time
        const nowTs = Date.now();
        if (
          nowTs - lastDisplayedUpdateTs.value >
          ANIMATION_TIMING.DISPLAY_UPDATE_THROTTLE_MS
        ) {
          lastDisplayedUpdateTs.value = nowTs;
        }
      })
      .onFinalize(() => {
        // Handle both normal completion and cancellation
        if (!isDragging.value) return;
        if (
          progressBarLayout.value.width <= 0 ||
          normalizedDurationShared.value <= 0
        ) {
          // Invalid state - reset everything
          runOnJS(resetDragState)();
          return;
        }

        // Calculate final seek time based on drag position (normalized)
        const progressRatio =
          dragPosition.value / progressBarLayout.value.width;
        const newTimeSeconds = progressRatio * normalizedDurationShared.value;

        // This handles both normal completion and cancellation
        runOnJS(onSeekEnd)(newTimeSeconds);
      });

    // Seek head position based on current progress or drag position
    const seekHeadStyle = useAnimatedStyle(() => {
      // Show dragged position if actively dragging or waiting for position to catch up
      if (isDragging.value && progressBarLayout.value.width > 0) {
        const draggedPct =
          (dragPosition.value / progressBarLayout.value.width) * 100;
        const clampedPct = Math.max(0, Math.min(100, draggedPct));

        return {
          left: `${clampedPct}%`,
          transform: [{ translateX: SPACING.SEEK_HEAD_OFFSET }], // Center the seek head (16px)
        };
      }

      // Normal position when not dragging
      const baseProgressPct = progressPct.value;
      return {
        left: `${baseProgressPct}%`,
        transform: [{ translateX: SPACING.SEEK_HEAD_OFFSET }], // Center the seek head (16px)
      };
    });

    // Progress fill style - shows either actual progress or dragged position
    const progressFillStyle = useAnimatedStyle(() => {
      // Show dragged position if actively dragging or waiting for position to catch up
      if (isDragging.value && progressBarLayout.value.width > 0) {
        const draggedPct =
          (dragPosition.value / progressBarLayout.value.width) * 100;
        const clampedPct = Math.max(0, Math.min(100, draggedPct));

        return {
          width: `${clampedPct}%`,
        };
      }

      // Show actual playback progress when not dragging
      const actualProgressPct = progressPct.value;
      return {
        width: `${actualProgressPct}%`,
      };
    });

    return (
      <Animated.View
        ref={progressBarRef}
        onLayout={e => {
          baseWidthRef.current = e.nativeEvent.layout.width;
          // Measure layout whenever container size changes
          measureLayout();
        }}
        style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: theme.colors.primary },
              progressFillStyle,
            ]}
          />
        </View>

        {/* Draggable Seek Head - gesture only on the handle */}
        <GestureDetector gesture={seekHeadPan}>
          <Animated.View
            style={[
              styles.seekHead,
              { backgroundColor: theme.colors.primary },
              seekHeadStyle,
            ]}
          />
        </GestureDetector>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  progressBarContainer: {
    height: PROGRESS_BAR.CONTAINER_HEIGHT, // larger touch target
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: PROGRESS_BAR.BAR_HEIGHT,
    width: '100%',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  seekHead: {
    position: 'absolute',
    width: PROGRESS_BAR.SEEK_HEAD.width,
    height: PROGRESS_BAR.SEEK_HEAD.height,
    borderRadius: PROGRESS_BAR.SEEK_HEAD.borderRadius,
    top: PROGRESS_BAR.SEEK_HEAD_TOP, // Center knob (16px) over 2px bar inside 24px container: 12 - 8 = 4
  },
});

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTheme } from '@/shared/hooks';
import { useRecordingSettingsStore } from '../stores/recording-settings-store';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

/**
 * Convert audio level (0-1) to dB for waveform (same as VUMeter)
 *
 * @param level - Audio level in 0-1 range (RMS)
 * @returns Audio level in dB (-34 to 0)
 */
const getAudioLevelDb = (level: number): number => {
  // Convert linear 0-1 to approximate dB scale (-34 to 0)
  // Using a logarithmic approximation
  if (level === 0) return -34;
  return Math.max(-34, 20 * Math.log10(level));
};

export interface WaveformDisplayProps {
  analysisData: AudioAnalysis | undefined;
  isRecording: boolean;
  isPaused: boolean;
}

/**
 * Waveform Display Component
 *
 * Displays real-time audio waveform visualization
 */
interface WaveformBarData {
  height: number; // Height percentage (0-100)
  isSegmentActive: boolean; // Whether segment is active (green) or not (red)
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  analysisData,
  isRecording,
  isPaused,
}) => {
  const { theme } = useTheme();

  // Get thresholds for determining bar color
  const { startThreshold, endThreshold } = useRecordingSettingsStore(
    useShallow(state => ({
      startThreshold: state.startThreshold,
      endThreshold: state.endThreshold,
    }))
  );

  // Accumulate ALL waveform bars (full history, not rolling buffer)
  const waveformBufferRef = useRef<WaveformBarData[]>([]);
  // Track last processed point ID to avoid reprocessing same point
  // Using ID tracking handles both growing arrays and rolling buffers
  const lastProcessedPointIdRef = useRef<number | undefined>(undefined);
  const analysisDataRef = useRef(analysisData);
  const scrollViewRef = useRef<ScrollView>(null);
  const [waveformData, setWaveformData] = useState<WaveformBarData[]>([]);
  // Track segment state: once start threshold is crossed, stay active until end threshold
  // Use ref so we can update it synchronously as we process each point
  // This ensures each bar captures the segment state at the time it was created
  const isSegmentActiveRef = useRef<boolean>(false);
  // Track if we should auto-scroll (true while recording, false when user manually scrolls)
  const shouldAutoScrollRef = useRef<boolean>(true);
  // Track if we've started a recording session (to detect new sessions)
  const hasStartedRecordingRef = useRef<boolean>(false);

  // Update ref when analysisData changes
  useEffect(() => {
    analysisDataRef.current = analysisData;
  }, [analysisData]);

  // Detect when a new recording session starts
  useEffect(() => {
    if (isRecording && !hasStartedRecordingRef.current) {
      // Recording just started - check if this is a new session or resuming
      // If analysisData exists and has points, check if they're newer than what we've processed
      const isNewSession =
        waveformData.length === 0 || // No existing data
        !analysisData?.dataPoints || // No analysis data yet
        analysisData.dataPoints.length === 0 || // Empty analysis data
        (lastProcessedPointIdRef.current !== undefined &&
          analysisData.dataPoints.length > 0 &&
          analysisData.dataPoints[0]?.id !== undefined &&
          analysisData.dataPoints[0].id <= lastProcessedPointIdRef.current); // Points reset (rolling buffer or new session)

      if (isNewSession) {
        // New recording session - reset everything
        waveformBufferRef.current = [];
        lastProcessedPointIdRef.current = undefined;
        isSegmentActiveRef.current = false;
        setWaveformData([]);
        shouldAutoScrollRef.current = true;
      }
      hasStartedRecordingRef.current = true;
    } else if (!isRecording && hasStartedRecordingRef.current) {
      // Recording stopped - preserve waveform data for scrolling
      // Just reset the flag so we can detect the next new session
      hasStartedRecordingRef.current = false;
    }
  }, [isRecording, analysisData, waveformData.length]);

  useEffect(() => {
    // When paused, keep current buffer but don't process new data
    if (isPaused || !analysisData?.dataPoints) {
      return;
    }

    // Enable auto-scroll when recording starts
    if (isRecording) {
      shouldAutoScrollRef.current = true;
    }

    // Access analysisData from ref to get latest data
    const currentAnalysisData = analysisDataRef.current;
    if (!currentAnalysisData?.dataPoints) {
      return;
    }

    const lastProcessedPointId = lastProcessedPointIdRef.current;

    // Find all unprocessed points (points with ID > lastProcessedPointId)
    // This handles both growing arrays and rolling buffers (same approach as useRecordingSegments)
    const unprocessedPoints: Array<{
      point: (typeof currentAnalysisData.dataPoints)[0];
      index: number;
    }> = [];

    for (let i = 0; i < currentAnalysisData.dataPoints.length; i++) {
      const point = currentAnalysisData.dataPoints[i];
      if (!point) continue;

      // If we haven't processed any points yet, or this point is newer
      if (
        lastProcessedPointId === undefined ||
        point.id > lastProcessedPointId
      ) {
        unprocessedPoints.push({ point, index: i });
      }
    }

    // If no new points, skip processing
    if (unprocessedPoints.length === 0) {
      return;
    }

    // Process all unprocessed data points
    const newBarData: WaveformBarData[] = [];
    for (const { point } of unprocessedPoints) {
      // Convert RMS to dB (same scale as VUMeter)
      const rmsValue = point.rms ?? 0;
      const audioLevelDb = getAudioLevelDb(rmsValue);

      // Convert dB to height percentage (same calculation as VUMeter)
      // dB range: -34 to 0, maps to 0% to 100%
      const heightPercent = Math.max(
        0,
        Math.min(100, ((audioLevelDb + 34) / 34) * 100)
      );

      // Update segment state based on this point's audio level (same logic as VU meter)
      // Start segment when crossing start threshold
      if (rmsValue >= startThreshold) {
        isSegmentActiveRef.current = true;
      }
      // End segment when crossing end threshold
      if (rmsValue <= endThreshold) {
        isSegmentActiveRef.current = false;
      }

      // Capture the segment state at the time this bar was created
      // This ensures each bar reflects its historical state, not the current live state
      newBarData.push({
        height: heightPercent,
        isSegmentActive: isSegmentActiveRef.current,
      });
    }

    // Accumulate new bars (append to existing buffer, don't remove old ones)
    const buffer = [...waveformBufferRef.current, ...newBarData];
    waveformBufferRef.current = buffer;

    // Update state to trigger re-render
    setWaveformData([...buffer]);

    // Update tracking ref - use the highest ID from processed points
    const highestId = Math.max(
      ...unprocessedPoints.map(({ point }) => point.id)
    );
    lastProcessedPointIdRef.current = highestId;
  }, [analysisData, isRecording, isPaused, startThreshold, endThreshold]);

  const isActive = isRecording && !isPaused;
  const waveformBarOpacity = isActive ? 1 : 0.3;

  // When recording becomes active, jump to end and enable auto-scroll
  useEffect(() => {
    if (isActive && waveformData.length > 0) {
      // Force scroll to end when recording becomes active
      shouldAutoScrollRef.current = true;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [isActive, waveformData.length]);

  // Auto-scroll to end while recording (when new bars are added)
  useEffect(() => {
    if (isActive && shouldAutoScrollRef.current && waveformData.length > 0) {
      // Use setTimeout to ensure the ScrollView has rendered the new content
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [waveformData.length, isActive]);

  // Handle scroll events (only relevant when scrolling is enabled, i.e., when paused/stopped)
  const handleScroll = (
    _event: NativeSyntheticEvent<NativeScrollEvent>
  ): void => {
    // Only track scroll position when not actively recording
    // This helps maintain scroll position when paused
    if (!isActive) {
      // User can scroll freely when paused or stopped
      // No need to track or disable auto-scroll since it's already disabled
    }
  };

  return (
    <View style={styles.waveform}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        scrollEnabled={!isActive} // Disable scrolling while recording is active
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.waveformBars}>
          {waveformData.map((barData, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  backgroundColor: barData.isSegmentActive
                    ? theme.colors.success
                    : theme.colors.error,
                  opacity: waveformBarOpacity,
                  height: `${barData.height}%` as `${number}%`,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  waveform: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end', // Align to bottom to match VUMeter
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Bars grow upward from bottom
    height: '100%',
    paddingHorizontal: 4,
    paddingBottom: 0, // Align x-axis with bottom of VUMeter
    paddingTop: 8,
    minWidth: '100%', // Ensure content is at least full width
  },
  waveformBar: {
    width: 3, // Fixed width for each bar (adjust as needed)
    marginHorizontal: 1,
    minHeight: 0, // Remove minHeight so bars can be truly zero
    borderRadius: 1,
  },
});

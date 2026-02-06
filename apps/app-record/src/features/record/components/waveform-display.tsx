import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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

  // Maintain a rolling buffer of 50 bar data (height + color)
  const waveformBufferRef = useRef<WaveformBarData[]>(
    Array.from({ length: 50 }, () => ({ height: 0, isSegmentActive: false }))
  );
  // Track last processed point ID to avoid reprocessing same point
  const lastProcessedPointIdRef = useRef<number | undefined>(undefined);
  const lastProcessedLengthRef = useRef<number>(0);
  const analysisDataRef = useRef(analysisData);
  const [waveformData, setWaveformData] = useState<WaveformBarData[]>(
    Array.from({ length: 50 }, () => ({ height: 0, isSegmentActive: false }))
  );
  // Track segment state: once start threshold is crossed, stay active until end threshold
  // Use ref so we can update it synchronously as we process each point
  // This ensures each bar captures the segment state at the time it was created
  const isSegmentActiveRef = useRef<boolean>(false);

  // Update ref when analysisData changes
  useEffect(() => {
    analysisDataRef.current = analysisData;
  }, [analysisData]);

  useEffect(() => {
    if (!isRecording || !analysisData?.dataPoints || isPaused) {
      // Reset when not recording or paused
      if (!isRecording) {
        waveformBufferRef.current = Array.from({ length: 50 }, () => ({
          height: 0,
          isSegmentActive: false,
        }));
        lastProcessedPointIdRef.current = undefined;
        lastProcessedLengthRef.current = 0;
        isSegmentActiveRef.current = false;
        setWaveformData(
          Array.from({ length: 50 }, () => ({
            height: 0,
            isSegmentActive: false,
          }))
        );
      }
      // When paused, keep current buffer but don't process new data
      return;
    }

    const dataPoints = analysisData.dataPoints;
    const currentLength = dataPoints.length;
    const lengthChanged = lastProcessedLengthRef.current !== currentLength;

    // Get the latest data point
    const latestPointIndex =
      lengthChanged && currentLength > lastProcessedLengthRef.current
        ? currentLength - 1
        : Math.max(0, currentLength - 1);

    const latestPoint = dataPoints[latestPointIndex];
    if (!latestPoint) {
      return;
    }

    // Check if this is actually a new point by comparing point ID
    const currentPointId = latestPoint.id;
    const lastProcessedPointId = lastProcessedPointIdRef.current;

    // Skip if we've already processed this point
    if (
      lastProcessedPointId !== undefined &&
      currentPointId === lastProcessedPointId &&
      !lengthChanged
    ) {
      return;
    }

    // Determine which points to process
    let startIndex = 0;
    if (lengthChanged && currentLength > lastProcessedLengthRef.current) {
      // Array grew: process only new points
      startIndex = lastProcessedLengthRef.current;
    } else {
      // Rolling buffer: process latest point only
      startIndex = latestPointIndex;
    }

    // Process data points
    const newBarData: WaveformBarData[] = [];
    for (let i = startIndex; i < currentLength; i++) {
      const point = dataPoints[i];
      if (!point) continue;

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

    // Only update if we have new data
    if (newBarData.length === 0) {
      // Still update tracking refs even if no new data
      lastProcessedPointIdRef.current = currentPointId;
      lastProcessedLengthRef.current = currentLength;
      return;
    }

    // Update rolling buffer: shift left and add new values to the right
    const buffer = [...waveformBufferRef.current];
    buffer.splice(0, newBarData.length); // Remove from left
    buffer.push(...newBarData); // Add to right
    waveformBufferRef.current = buffer;

    // Update state to trigger re-render
    setWaveformData([...buffer]);

    // Update tracking refs
    lastProcessedPointIdRef.current = currentPointId;
    lastProcessedLengthRef.current = currentLength;
  }, [analysisData, isRecording, isPaused, startThreshold, endThreshold]);

  const isActive = isRecording && !isPaused;
  const waveformBarOpacity = isActive ? 1 : 0.3;

  return (
    <View style={styles.waveform}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  waveform: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end', // Align to bottom to match VUMeter
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Bars grow upward from bottom
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
    paddingBottom: 0, // Align x-axis with bottom of VUMeter
    paddingTop: 8,
  },
  waveformBar: {
    flex: 1,
    marginHorizontal: 1,
    minHeight: 0, // Remove minHeight so bars can be truly zero
    borderRadius: 1,
  },
});

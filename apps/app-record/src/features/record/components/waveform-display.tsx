import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

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
export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  analysisData,
  isRecording,
  isPaused,
}) => {
  const { theme } = useTheme();

  // Process waveform data (no memoization)
  let waveformData: number[] = Array.from({ length: 50 }, () => 0);

  if (isRecording && analysisData?.dataPoints) {
    const dataPoints = analysisData.dataPoints;
    const currentLength = dataPoints.length;

    // Use only the last 100 points for real-time visualization (rolling window)
    const maxPoints = 50;
    const recentPoints =
      currentLength > maxPoints ? dataPoints.slice(-maxPoints) : dataPoints;

    const samples = Math.min(50, recentPoints.length);
    const step = Math.max(1, Math.floor(recentPoints.length / samples));

    // Get amplitude range for normalization from recent points
    const ampRange = analysisData.amplitudeRange;
    const range = ampRange.max - ampRange.min || 1;

    waveformData = Array.from({ length: samples }, (_, i) => {
      const point = recentPoints[i * step];
      if (!point) return 0;
      // Normalize amplitude to 0-1 range
      const normalizedValue = (point.amplitude - ampRange.min) / range;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  }

  const isActive = isRecording && !isPaused;
  const waveformBarColor = isActive
    ? theme.colors.error
    : theme.colors.textSecondary;
  const waveformBarOpacity = isActive ? 1 : 0.3;

  return (
    <View style={styles.waveform}>
      <View style={styles.waveformBars}>
        {waveformData.map((value, index) => (
          <View
            key={index}
            style={[
              styles.waveformBar,
              {
                backgroundColor: waveformBarColor,
                opacity: waveformBarOpacity,
                height: `${Math.max(2, value * 100)}%` as `${number}%`,
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
    justifyContent: 'center',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  waveformBar: {
    flex: 1,
    marginHorizontal: 1,
    minHeight: 2,
    borderRadius: 1,
    marginVertical: 'auto',
  },
});

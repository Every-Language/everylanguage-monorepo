import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

export interface VUMeterProps {
  analysisData: AudioAnalysis | undefined;
  isRecording: boolean;
  isPaused: boolean;
}

/**
 * Convert audio level (0-1) to dB for VU meter
 *
 * @param level - Audio level in 0-1 range
 * @returns Audio level in dB (-34 to 0)
 */
const getAudioLevelDb = (level: number): number => {
  // Convert linear 0-1 to approximate dB scale (-34 to 0)
  // Using a logarithmic approximation
  if (level === 0) return -34;
  return Math.max(-34, 20 * Math.log10(level));
};

/**
 * VU Meter Component
 *
 * Displays audio level in decibels with color-coded visualization
 */
export const VUMeter: React.FC<VUMeterProps> = ({
  analysisData,
  isRecording,
  isPaused,
}) => {
  const { theme } = useTheme();

  // Extract latest RMS value
  const latestRms =
    analysisData?.dataPoints?.length &&
    analysisData.dataPoints[analysisData.dataPoints.length - 1]?.rms;

  const audioLevel = latestRms ?? 0;
  const audioLevelDb = getAudioLevelDb(audioLevel);

  const vuMeterFillHeight =
    `${Math.max(0, Math.min(100, ((audioLevelDb + 34) / 34) * 100))}%` as const;
  const isHighLevel = audioLevelDb > -12;

  return (
    <View style={styles.vuMeter}>
      <View style={styles.vuMeterScale}>
        <Text
          style={[styles.vuMeterLabel, { color: theme.colors.textSecondary }]}>
          0
        </Text>
        <Text
          style={[styles.vuMeterLabel, { color: theme.colors.textSecondary }]}>
          -12
        </Text>
        <Text
          style={[styles.vuMeterLabel, { color: theme.colors.textSecondary }]}>
          -24
        </Text>
        <Text
          style={[styles.vuMeterLabel, { color: theme.colors.textSecondary }]}>
          -34
        </Text>
      </View>
      <View
        style={[styles.vuMeterBar, { backgroundColor: theme.colors.border }]}>
        {isRecording && !isPaused && audioLevel > 0 && (
          <View
            style={[
              styles.vuMeterFill,
              {
                height: vuMeterFillHeight as `${number}%`,
                backgroundColor: isHighLevel
                  ? theme.colors.error
                  : theme.colors.success,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  vuMeter: {
    width: 40,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  vuMeterScale: {
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 4,
  },
  vuMeterLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  vuMeterBar: {
    width: 20,
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  vuMeterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 10,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/shared/hooks';
import { VUMeter } from './VUMeter';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

export interface RecordingSettingsContentProps {
  analysisData: AudioAnalysis | undefined;
  isMonitoring: boolean;
  startThreshold: number;
  endThreshold: number;
  onStartThresholdChange: (value: number) => void;
  onEndThresholdChange: (value: number) => void;
}

/**
 * Recording Settings Content Component
 *
 * Displays live noise meter and threshold controls
 */
export const RecordingSettingsContent: React.FC<
  RecordingSettingsContentProps
> = ({
  analysisData,
  isMonitoring,
  startThreshold,
  endThreshold,
  onStartThresholdChange,
  onEndThresholdChange,
}) => {
  const { theme } = useTheme();

  // Get current audio level for threshold visualization
  const latestRms =
    analysisData?.dataPoints?.length &&
    analysisData.dataPoints[analysisData.dataPoints.length - 1]?.rms;
  const currentLevel = latestRms ?? 0;

  // Determine if current level would trigger segment start/end
  const wouldStartSegment = currentLevel >= startThreshold;
  const wouldEndSegment = currentLevel <= endThreshold;
  const isSegmentActive = wouldStartSegment && !wouldEndSegment;

  return (
    <View style={styles.container}>
      {/* Live Noise Meter */}
      <View style={styles.meterSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Live Noise Meter
        </Text>
        <View
          style={[
            styles.meterContainer,
            { backgroundColor: theme.colors.surface },
          ]}>
          <View style={styles.meterWrapper}>
            <VUMeter analysisData={analysisData} isActive={isMonitoring} />
          </View>
          {isMonitoring && (
            <View style={styles.meterStatus}>
              <Text
                style={[
                  styles.meterStatusText,
                  { color: theme.colors.textSecondary },
                ]}>
                {isSegmentActive ? 'Segment Active' : 'Listening...'}
              </Text>
              <Text
                style={[
                  styles.meterLevelText,
                  { color: theme.colors.textSecondary },
                ]}>
                Level: {currentLevel.toFixed(3)}
              </Text>
            </View>
          )}
          {!isMonitoring && (
            <Text
              style={[
                styles.meterPlaceholder,
                { color: theme.colors.textSecondary },
              ]}>
              Start monitoring to see live audio levels
            </Text>
          )}
        </View>
      </View>

      {/* Threshold Controls */}
      <View style={styles.thresholdsSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Threshold Settings
        </Text>

        {/* Start Threshold */}
        <View style={styles.thresholdControl}>
          <View style={styles.thresholdHeader}>
            <Text style={[styles.thresholdLabel, { color: theme.colors.text }]}>
              Start Threshold
            </Text>
            <View
              style={[
                styles.thresholdIndicator,
                {
                  backgroundColor: wouldStartSegment
                    ? theme.colors.success
                    : theme.colors.border,
                },
              ]}
            />
            <Text style={[styles.thresholdValue, { color: theme.colors.text }]}>
              {startThreshold.toFixed(3)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.4}
            step={0.001}
            value={startThreshold}
            onValueChange={onStartThresholdChange}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
          />
          <Text
            style={[
              styles.thresholdHint,
              { color: theme.colors.textSecondary },
            ]}>
            Audio level must exceed this to start a segment
          </Text>
        </View>

        {/* End Threshold */}
        <View style={styles.thresholdControl}>
          <View style={styles.thresholdHeader}>
            <Text style={[styles.thresholdLabel, { color: theme.colors.text }]}>
              End Threshold
            </Text>
            <View
              style={[
                styles.thresholdIndicator,
                {
                  backgroundColor: wouldEndSegment
                    ? theme.colors.error
                    : theme.colors.border,
                },
              ]}
            />
            <Text style={[styles.thresholdValue, { color: theme.colors.text }]}>
              {endThreshold.toFixed(3)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.4}
            step={0.001}
            value={endThreshold}
            onValueChange={onEndThresholdChange}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
          />
          <Text
            style={[
              styles.thresholdHint,
              { color: theme.colors.textSecondary },
            ]}>
            Audio level must drop below this to end a segment
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 24,
  },
  meterSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  meterContainer: {
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meterWrapper: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterStatus: {
    marginTop: 12,
    alignItems: 'center',
    gap: 4,
  },
  meterStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  meterLevelText: {
    fontSize: 12,
  },
  meterPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
  },
  thresholdsSection: {
    gap: 12,
  },
  thresholdControl: {
    gap: 8,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdLabel: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  thresholdIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  thresholdValue: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thresholdHint: {
    fontSize: 12,
    marginTop: -4,
  },
});

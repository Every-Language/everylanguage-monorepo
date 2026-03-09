import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MenuView, MenuAction } from '@react-native-menu/menu';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/shared/hooks';
import { VUMeter } from './vu-meter';
import { rmsToDb } from '../utils/audio-level-utils';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';
import type { MeasurementType } from '../stores/recording-settings-store';

export interface RecordingSettingsContentProps {
  analysisData: AudioAnalysis | undefined;
  isMonitoring: boolean;
  startThreshold: number;
  endThreshold: number;
  endThresholdSustainMs: number;
  measurementType: MeasurementType;
  onStartThresholdChange: (value: number) => void;
  onEndThresholdChange: (value: number) => void;
  onEndThresholdSustainMsChange: (value: number) => void;
  onMeasurementTypeChange: (type: MeasurementType) => void;
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
  endThresholdSustainMs,
  measurementType,
  onStartThresholdChange,
  onEndThresholdChange,
  onEndThresholdSustainMsChange,
  onMeasurementTypeChange,
}) => {
  const { theme } = useTheme();

  // Get current audio level for threshold visualization
  const latestRms =
    analysisData?.dataPoints?.length &&
    analysisData.dataPoints[analysisData.dataPoints.length - 1]?.rms;
  const currentLevel = latestRms ?? 0;
  const currentLevelDb = rmsToDb(currentLevel);

  // Format current level based on measurement type
  const formattedCurrentLevel =
    measurementType === 'db'
      ? `${currentLevelDb.toFixed(1)} dB`
      : `${currentLevel.toFixed(3)} RMS`;

  // Format thresholds based on measurement type
  const formatThreshold = (threshold: number): string => {
    if (measurementType === 'db') {
      return `${rmsToDb(threshold).toFixed(1)} dB`;
    }
    return `${threshold.toFixed(3)} RMS`;
  };

  // Determine if current level would trigger segment start/end
  const wouldStartSegment = currentLevel >= startThreshold;
  const wouldEndSegment = currentLevel <= endThreshold;
  const isSegmentActive = wouldStartSegment && !wouldEndSegment;

  const actions: MenuAction[] = useMemo(() => {
    const entries: Array<{ id: MeasurementType; title: string }> = [
      { id: 'db', title: 'dB' },
      { id: 'rms', title: 'RMS' },
    ];
    return entries.map(({ id, title }) => ({
      id,
      title,
      state: measurementType === id ? 'on' : 'off',
    }));
  }, [measurementType]);

  const onPressAction = useCallback(
    ({ nativeEvent }: { nativeEvent: { event: string } }) => {
      const selected = nativeEvent.event as MeasurementType;
      if (selected === 'db' || selected === 'rms') {
        onMeasurementTypeChange(selected);
      }
    },
    [onMeasurementTypeChange]
  );

  const getMeasurementLabel = useCallback((type: MeasurementType): string => {
    return type === 'db' ? 'dB' : 'RMS';
  }, []);

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
            <VUMeter
              analysisData={analysisData}
              isActive={isMonitoring}
              startThreshold={startThreshold}
              endThreshold={endThreshold}
              scaleType={measurementType}
              showThresholdValues={true}
              thresholdValueType={measurementType}
            />
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
                Level: {formattedCurrentLevel}
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

      {/* Audio Levels Measurement */}
      <View style={styles.measurementSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Audio Levels Measurement
        </Text>
        <MenuView onPressAction={onPressAction} actions={actions}>
          <TouchableOpacity
            style={[
              styles.measurementRow,
              { backgroundColor: theme.colors.surface },
            ]}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.measurementRowTitle,
                { color: theme.colors.text },
              ]}>
              Measurement Type
            </Text>
            <Text
              style={[
                styles.measurementRowValue,
                { color: theme.colors.textSecondary },
              ]}>
              {getMeasurementLabel(measurementType)}
            </Text>
          </TouchableOpacity>
        </MenuView>
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
              {formatThreshold(startThreshold)}
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
              {formatThreshold(endThreshold)}
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

        {/* End Threshold Sustain */}
        <View style={styles.thresholdControl}>
          <View style={styles.thresholdHeader}>
            <Text style={[styles.thresholdLabel, { color: theme.colors.text }]}>
              End Threshold Sustain
            </Text>
            <Text style={[styles.thresholdValue, { color: theme.colors.text }]}>
              {endThresholdSustainMs}ms
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={50}
            maximumValue={500}
            step={50}
            value={endThresholdSustainMs}
            onValueChange={onEndThresholdSustainMsChange}
            minimumTrackTintColor={theme.colors.accent}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.accent}
          />
          <Text
            style={[
              styles.thresholdHint,
              { color: theme.colors.textSecondary },
            ]}>
            Duration audio must stay below end threshold before segment ends (
            {Math.ceil(endThresholdSustainMs / 50)} data points)
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
  measurementSection: {
    gap: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  measurementRowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  measurementRowValue: {
    fontSize: 14,
    fontWeight: '500',
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
    minWidth: 80,
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

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { rmsToDb } from '../utils/audio-level-utils';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

export type ScaleType = 'db' | 'rms';

export interface VUMeterProps {
  analysisData: AudioAnalysis | undefined;
  isRecording?: boolean;
  isPaused?: boolean;
  isActive?: boolean; // For monitoring mode (overrides isRecording && !isPaused)
  startThreshold?: number; // RMS threshold for starting segments (0-1)
  endThreshold?: number; // RMS threshold for ending segments (0-1)
  scaleType?: ScaleType; // Which scale to show on the left ('db' or 'rms')
  showThresholdValues?: boolean; // Whether to show threshold values on the right
  thresholdValueType?: ScaleType; // Which type to show for threshold values ('db' or 'rms')
}

/**
 * VU Meter Component
 *
 * Displays audio level in decibels with color-coded visualization
 */
export const VUMeter: React.FC<VUMeterProps> = ({
  analysisData,
  isRecording = false,
  isPaused = false,
  isActive,
  startThreshold,
  endThreshold,
  scaleType = 'db',
  showThresholdValues = false,
  thresholdValueType = 'rms',
}) => {
  const { theme } = useTheme();

  // Extract latest RMS value
  const latestRms =
    analysisData?.dataPoints?.length &&
    analysisData.dataPoints[analysisData.dataPoints.length - 1]?.rms;

  const audioLevel = latestRms ?? 0;
  const audioLevelDb = rmsToDb(audioLevel);

  // Calculate fill height - always use dB-based positioning for consistency
  // The scaleType only affects which labels are shown, not the positioning
  const vuMeterFillHeight = `${Math.max(
    0,
    Math.min(100, ((audioLevelDb + 34) / 34) * 100)
  )}%`;

  // Use isActive if provided, otherwise fall back to isRecording && !isPaused
  const shouldShowFill =
    (isActive !== undefined ? isActive : isRecording && !isPaused) &&
    audioLevel > 0;

  // Track segment state: once start threshold is crossed, stay active until end threshold
  const [isSegmentActive, setIsSegmentActive] = useState(false);

  useEffect(() => {
    if (
      startThreshold === undefined ||
      endThreshold === undefined ||
      !shouldShowFill
    ) {
      setIsSegmentActive(false);
      return;
    }

    // Start segment when crossing start threshold
    if (audioLevel >= startThreshold) {
      setIsSegmentActive(true);
    }

    // End segment when crossing end threshold
    if (audioLevel <= endThreshold) {
      setIsSegmentActive(false);
    }
  }, [audioLevel, startThreshold, endThreshold, shouldShowFill]);

  // Choose fill color based on segment activity
  const fillColor = isSegmentActive ? theme.colors.success : theme.colors.error;

  // Calculate scale values based on scaleType
  // For dB scale: 0, -12, -24, -34
  // For RMS scale: corresponding RMS values at those positions
  const dbScaleValues = [0, -12, -24, -34];
  const rmsScaleValues = dbScaleValues.map(db => Math.pow(10, db / 20));

  // Calculate threshold positions - always use dB-based positioning for consistency
  // The scaleType only affects which labels are shown, not the positioning
  const getThresholdHeight = (thresholdRms: number): string | null => {
    const thresholdDb = rmsToDb(thresholdRms);
    return `${Math.max(0, Math.min(100, ((thresholdDb + 34) / 34) * 100))}%`;
  };

  const startThresholdHeight =
    startThreshold !== undefined ? getThresholdHeight(startThreshold) : null;
  const endThresholdHeight =
    endThreshold !== undefined ? getThresholdHeight(endThreshold) : null;

  // Get scale labels based on scaleType
  const scaleLabels =
    scaleType === 'db'
      ? dbScaleValues.map(db => db.toString())
      : rmsScaleValues.map(rms => rms.toFixed(3));

  // Format threshold value based on thresholdValueType
  const formatThresholdValue = (thresholdRms: number): string => {
    if (thresholdValueType === 'db') {
      return `${rmsToDb(thresholdRms).toFixed(1)}`;
    }
    return `${thresholdRms.toFixed(3)}`;
  };

  return (
    <View style={styles.vuMeter}>
      {/* Scale on the left */}
      <View style={styles.vuMeterScale}>
        {scaleLabels.map((label, index) => (
          <Text
            key={index}
            style={[
              styles.vuMeterLabel,
              { color: theme.colors.textSecondary },
            ]}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.vuMeterBarContainer}>
        <View
          style={[styles.vuMeterBar, { backgroundColor: theme.colors.border }]}>
          {/* Audio level fill */}
          {shouldShowFill && (
            <View
              style={[
                styles.vuMeterFill,
                {
                  height: vuMeterFillHeight as `${number}%`,
                  backgroundColor: fillColor,
                },
              ]}
            />
          )}
          {/* Threshold indicators - rendered on top */}
          {endThresholdHeight !== null && (
            <View
              style={[
                styles.thresholdIndicator,
                {
                  bottom: endThresholdHeight,
                  backgroundColor: theme.colors.error,
                  borderColor: theme.colors.error,
                },
              ]}
            />
          )}
          {startThresholdHeight !== null && (
            <View
              style={[
                styles.thresholdIndicator,
                {
                  bottom: startThresholdHeight,
                  backgroundColor: theme.colors.success,
                  borderColor: theme.colors.success,
                },
              ]}
            />
          )}
        </View>
        {/* Threshold markers extending outside the bar */}
        {endThresholdHeight !== null && endThreshold !== undefined && (
          <View
            style={[
              styles.thresholdMarker,
              {
                bottom: endThresholdHeight,
                backgroundColor: theme.colors.error,
              },
            ]}
          />
        )}
        {startThresholdHeight !== null && startThreshold !== undefined && (
          <View
            style={[
              styles.thresholdMarker,
              {
                bottom: startThresholdHeight,
                backgroundColor: theme.colors.success,
              },
            ]}
          />
        )}
      </View>
      {/* Threshold values on the right side */}
      {showThresholdValues && (
        <View style={styles.thresholdValuesContainer}>
          {endThresholdHeight !== null && endThreshold !== undefined && (
            <View
              style={[
                styles.thresholdValueContainer,
                {
                  bottom: endThresholdHeight,
                },
              ]}>
              <Text
                style={[styles.thresholdValue, { color: theme.colors.error }]}>
                {formatThresholdValue(endThreshold)}
              </Text>
            </View>
          )}
          {startThresholdHeight !== null && startThreshold !== undefined && (
            <View
              style={[
                styles.thresholdValueContainer,
                {
                  bottom: startThresholdHeight,
                },
              ]}>
              <Text
                style={[
                  styles.thresholdValue,
                  { color: theme.colors.success },
                ]}>
                {formatThresholdValue(startThreshold)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  vuMeter: {
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
  vuMeterBarContainer: {
    position: 'relative',
    width: 20,
    height: '100%',
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
    zIndex: 1,
  },
  thresholdIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    zIndex: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 3, // Android shadow
  },
  thresholdMarker: {
    position: 'absolute',
    left: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: 30,
  },
  thresholdValuesContainer: {
    position: 'relative',
    width: 60,
    height: '100%',
    marginLeft: 8,
  },
  thresholdValueContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  thresholdValue: {
    fontSize: 9,
    fontWeight: '600',
  },
});

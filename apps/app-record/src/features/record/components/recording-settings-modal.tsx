import React from 'react';
import {
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';
import { useRecordingSettings } from '../hooks/useRecordingSettings';
import { RecordingSettingsHeader } from './recording-settings-header';
import { RecordingSettingsContent } from './recording-settings-content';

export interface RecordingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Recording Settings Modal Component
 *
 * Modal for configuring recording thresholds with live noise meter preview
 */
export const RecordingSettingsModal: React.FC<RecordingSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();

  const {
    startThreshold,
    endThreshold,
    endThresholdSustainMs,
    measurementType,
    setStartThreshold,
    setEndThreshold,
    setEndThresholdSustainMs,
    setMeasurementType,
    analysisData,
    isMonitoring,
    error,
  } = useRecordingSettings(visible);

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}>
      <SafeAreaView
        {...(Platform.OS === 'ios'
          ? { edges: ['bottom', 'left', 'right'] as const }
          : {})}
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <RecordingSettingsHeader onClose={onClose} />

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {error && (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: theme.colors.error + '20' },
              ]}>
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {error.message}
              </Text>
            </View>
          )}
          <RecordingSettingsContent
            analysisData={analysisData}
            isMonitoring={isMonitoring}
            startThreshold={startThreshold}
            endThreshold={endThreshold}
            endThresholdSustainMs={endThresholdSustainMs}
            measurementType={measurementType}
            onStartThresholdChange={setStartThreshold}
            onEndThresholdChange={setEndThreshold}
            onEndThresholdSustainMsChange={setEndThresholdSustainMs}
            onMeasurementTypeChange={setMeasurementType}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

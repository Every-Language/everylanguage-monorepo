import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';
import { useShallow } from 'zustand/react/shallow';
import { useRecording, useRecordingMutations } from '../hooks';
import { useRecordingSettingsStore } from '../stores/recording-settings-store';
import {
  WaveformDisplay,
  VUMeter,
  TempSegmentsList,
  RecordModalHeader,
  RecordModalFooter,
} from './';

export interface RecordModalProps {
  visible: boolean;
  sequenceId: string;
  projectId: string;
  onClose: () => void;
  onSegmentsInserted?: () => void;
}

/**
 * Record Modal Component
 *
 * Modal for recording audio with live waveform and real-time segment generation.
 * Uses @siteed/expo-audio-studio for recording and threshold detection.
 */
export const RecordModal: React.FC<RecordModalProps> = ({
  visible,
  sequenceId,
  projectId,
  onClose,
  onSegmentsInserted,
}) => {
  const { theme } = useTheme();

  const {
    tempSegments,
    isRecording,
    isPaused,
    analysisData,
    hasActiveSegment,
    activeSegmentId,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleCleanup,
  } = useRecording(sequenceId, projectId, visible);

  // Get thresholds and measurement type for VU meter display
  const { startThreshold, endThreshold, measurementType } =
    useRecordingSettingsStore(
      useShallow(state => ({
        startThreshold: state.startThreshold,
        endThreshold: state.endThreshold,
        measurementType: state.measurementType,
      }))
    );

  const { insertSegments } = useRecordingMutations();

  const handleSave = async (): Promise<void> => {
    // If recording, stop first (this will extract segment files)
    if (isRecording) {
      await handleStopRecording();
      return;
    }

    // Verify segment files exist before saving (more reliable than state check)
    if (tempSegments.length > 0) {
      const { FilePathService } = await import('../services/file-path-service');
      const allFilesExist = await Promise.all(
        tempSegments.map(segment =>
          FilePathService.fileExists(segment.local_file_path)
        )
      );

      if (!allFilesExist.every(exists => exists)) {
        // eslint-disable-next-line no-console
        console.error(
          'Some segment files do not exist yet, cannot save',
          allFilesExist
        );
        return;
      }

      // Insert segments into the segments list (persist to database)
      await handleInsert();
    } else if (!isRecording && tempSegments.length === 0) {
      // Start recording if no segments yet and wasn't recording
      await handleStartRecording();
    }
  };

  const handleCancel = async (): Promise<void> => {
    // Cleanup extracted files if user cancels
    await handleCleanup();
    onClose();
  };

  const handleInsert = async (): Promise<void> => {
    // TODO: Get user ID from auth
    const userId = null;

    // Get completed non-hidden segments
    const segmentsToInsert = tempSegments.filter(
      s => s.recording_status === 'completed'
    );

    if (segmentsToInsert.length === 0) {
      onClose();
      return;
    }

    insertSegments.mutate(
      {
        sequenceId,
        projectId,
        tempSegments: segmentsToInsert,
        insertAfterIndex: null, // Insert at beginning for now
        userId,
      },
      {
        onSuccess: () => {
          if (onSegmentsInserted) onSegmentsInserted();
          onClose();
        },
        onError: error => {
          // Error is already logged by the hook
          // eslint-disable-next-line no-console
          console.error('Failed to insert segments:', error);
        },
      }
    );
  };

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
        <RecordModalHeader onClose={onClose} />

        {/* Recording Meter - Fixed at top */}
        <View style={styles.meterContainer}>
          <View
            style={[
              styles.waveformWrapper,
              { backgroundColor: theme.colors.surface },
            ]}>
            <WaveformDisplay
              analysisData={analysisData}
              isRecording={isRecording}
              isPaused={isPaused}
            />
            <VUMeter
              analysisData={analysisData}
              isRecording={isRecording}
              isPaused={isPaused}
              startThreshold={startThreshold}
              endThreshold={endThreshold}
              scaleType={measurementType}
              showThresholdValues={false}
            />
          </View>
        </View>

        {/* Segments List - Scrollable */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <TempSegmentsList
            segments={tempSegments}
            isRecording={isRecording}
            hasActiveSegment={hasActiveSegment}
            activeSegmentId={activeSegmentId}
          />
        </ScrollView>

        {/* Footer Controls */}
        <RecordModalFooter
          isRecording={isRecording}
          isPaused={isPaused}
          hasSegments={tempSegments.length > 0}
          onCancel={handleCancel}
          onPause={handlePauseRecording}
          onSave={handleSave}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  meterContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
  },
  waveformWrapper: {
    flexDirection: 'row',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    gap: 12,
  },
});

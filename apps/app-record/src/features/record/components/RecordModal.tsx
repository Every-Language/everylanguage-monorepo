import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/hooks';
import { useRecording, useRecordingMutations } from '../hooks';
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
    recordingMode,
    isRecording,
    isPaused,
    analysisData,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleToggleHide,
  } = useRecording(sequenceId, projectId, visible);

  const { insertSegments } = useRecordingMutations();

  const handleSave = async (): Promise<void> => {
    const wasRecording = isRecording;

    if (wasRecording) {
      await handleStopRecording();
    }

    // Get completed segments (non-hidden)
    const completedSegments = tempSegments.filter(
      s => s.recording_status === 'completed' && !s.is_hidden
    );

    if (completedSegments.length > 0) {
      // Insert segments into the segments list
      await handleInsert();
    } else if (!wasRecording && tempSegments.length === 0) {
      // Start recording if no segments yet and wasn't recording
      await handleStartRecording();
    }
  };

  const handleInsert = async (): Promise<void> => {
    // TODO: Get user ID from auth
    const userId = null;

    // Get completed non-hidden segments
    const segmentsToInsert = tempSegments.filter(
      s => s.recording_status === 'completed' && !s.is_hidden
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
          if (onSegmentsInserted) {
            onSegmentsInserted();
          }
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

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {/* Waveform - Always visible */}
          <View style={styles.waveformContainer}>
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
              />
            </View>
          </View>

          {/* Segments List */}
          <TempSegmentsList
            segments={tempSegments}
            recordingMode={recordingMode}
            onToggleHide={handleToggleHide}
          />
        </ScrollView>

        {/* Footer Controls */}
        <RecordModalFooter
          isRecording={isRecording}
          isPaused={isPaused}
          hasSegments={tempSegments.length > 0}
          onCancel={onClose}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  waveformContainer: {
    marginBottom: 24,
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

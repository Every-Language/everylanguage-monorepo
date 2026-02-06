import { useEffect, useCallback } from 'react';
import {
  useAudioRecorder,
  ExpoAudioStreamModule,
} from '@siteed/expo-audio-studio';
import { FilePathService } from '../services/file-path-service';
import { RECORDING_CONFIG } from '../constants/recordingConfig';
import { useRecordingSegments } from './useRecordingSegments';
import { useRecordingFileOperations } from './useRecordingFileOperations';

/**
 * Hook for managing audio recording with automatic segment detection
 *
 * Orchestrates recording, segment detection, and file operations.
 * Separated into focused hooks for maintainability.
 *
 * @param sequenceId - Sequence ID
 * @param projectId - Project ID
 * @param visible - Whether the recording modal is visible
 * @returns Recording state and handlers
 */
export const useRecording = (
  sequenceId: string,
  projectId: string,
  visible: boolean
) => {
  // Audio recorder hook
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    durationMs,
    analysisData,
  } = useAudioRecorder();

  // Segment detection hook
  const {
    tempSegments,
    segmentsRef,
    currentSegmentRef,
    resetSegments,
    finalizeActiveSegment,
    detectSegmentsFromPostAnalysis,
  } = useRecordingSegments(
    sequenceId,
    projectId,
    isRecording,
    isPaused,
    durationMs,
    analysisData
  );

  // File operations hook
  const {
    segmentsExtracted,
    extractSegmentsFromRecording,
    setMainRecordingUri,
    cleanupFiles,
    resetFileOperations,
  } = useRecordingFileOperations(sequenceId, tempSegments);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      resetSegments();
      resetFileOperations();
    }
  }, [visible, resetSegments, resetFileOperations]);

  const handleStartRecording = useCallback(async (): Promise<void> => {
    try {
      // Request microphone permissions first
      const { status } = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (status !== 'granted') {
        // eslint-disable-next-line no-console
        console.error('Recording permission not granted:', status);
        throw new Error('Recording permission has not been granted');
      }

      // Ensure directory exists
      await FilePathService.ensureSequenceDirectory(sequenceId);

      const recordingConfig = {
        sampleRate: RECORDING_CONFIG.sample_rate,
        channels: (RECORDING_CONFIG.channels === 1 ? 1 : 2) as 1 | 2,
        encoding: 'pcm_16bit' as const,
        enableProcessing: true,
        interval: 50,
        intervalAnalysis: 50,
        output: {
          primary: {
            enabled: true,
          },
          compressed: {
            enabled: true,
          },
        },
        autoResumeAfterInterruption: true,
        keepAwake: true,
      };

      // Start recording with config
      await startRecording(recordingConfig);

      currentSegmentRef.current = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start recording:', error);
      throw error; // Re-throw to allow UI to handle the error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceId, startRecording]); // currentSegmentRef is a ref, doesn't need to be in deps

  const handleStopRecording = useCallback(async (): Promise<void> => {
    try {
      // Stop recording and get the main recording file
      const recording = await stopRecording();

      if (!recording) {
        // eslint-disable-next-line no-console
        console.error('No recording returned from stopRecording');
        return;
      }

      // eslint-disable-next-line no-console
      console.log('Recording stopped:', {
        durationMs: recording.durationMs,
        fileUri: recording.fileUri,
        compressedFileUri: recording.compression?.compressedFileUri,
      });

      // Get the main recording file URI (use compressed if available, otherwise primary)
      const mainRecordingUri =
        recording.compression?.compressedFileUri || recording.fileUri;

      if (!mainRecordingUri) {
        // eslint-disable-next-line no-console
        console.error('No recording file URI available');
        return;
      }

      // eslint-disable-next-line no-console
      console.log('Main recording URI:', mainRecordingUri);

      // Store main recording URI for potential re-extraction
      setMainRecordingUri(mainRecordingUri);

      // Check if real-time analysis produced any data points
      const hasRealTimeData = (analysisData?.dataPoints?.length ?? 0) > 0;

      if (hasRealTimeData) {
        // === NORMAL PATH: Real-time analysis worked ===
        // If there's an active segment, finalize it
        const finalizedSegment = finalizeActiveSegment(recording.durationMs);

        const allSegments = finalizedSegment
          ? [...segmentsRef.current, finalizedSegment]
          : segmentsRef.current;

        await extractSegmentsFromRecording(mainRecordingUri, allSegments);
      } else {
        // === FALLBACK PATH: Real-time analysis unavailable ===
        // Use post-recording analysis on the compressed file to detect segments
        // eslint-disable-next-line no-console
        console.log(
          'Real-time analysis unavailable, using post-recording analysis fallback'
        );

        const fallbackSegments = await detectSegmentsFromPostAnalysis(
          mainRecordingUri,
          recording.durationMs
        );

        if (fallbackSegments.length > 0) {
          await extractSegmentsFromRecording(
            mainRecordingUri,
            fallbackSegments
          );
        }
      }

      currentSegmentRef.current = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to stop recording:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stopRecording,
    analysisData,
    setMainRecordingUri,
    finalizeActiveSegment,
    segmentsRef,
    extractSegmentsFromRecording,
    detectSegmentsFromPostAnalysis,
  ]); // currentSegmentRef is a ref, doesn't need to be in deps

  const handlePauseRecording = useCallback(async (): Promise<void> => {
    try {
      if (isPaused) {
        await resumeRecording();
      } else {
        await pauseRecording();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to pause/resume recording:', error);
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  return {
    // State
    tempSegments,
    isRecording,
    isPaused,
    durationMs,
    analysisData,
    segmentsExtracted,
    // Handlers
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleCleanup: cleanupFiles,
  };
};

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder } from '@siteed/expo-audio-studio';
import { FilePathService } from '../services/FilePathService';
import { RECORDING_CONFIG } from '../constants/recordingConfig';
import type { TempSegment } from '../types';

/**
 * Generate UUID for segment ID
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Hook for managing audio recording with automatic segment detection
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
  const [tempSegments, setTempSegments] = useState<TempSegment[]>([]);
  const [recordingMode, setRecordingMode] = useState<'recording' | 'edit'>(
    'recording'
  );
  const [nextSegmentIndex, setNextSegmentIndex] = useState(1);

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

  // Track current segment state
  const currentSegmentRef = useRef<{
    id: string;
    startTimeMs: number;
    startAudioLevel: number;
    isActive: boolean;
  } | null>(null);

  // Track last processed data point index to avoid reprocessing
  const lastProcessedIndexRef = useRef<number>(0);
  // Store current analysisData in ref to avoid dependency issues
  const analysisDataRef = useRef(analysisData);

  // Update ref when analysisData changes (but don't trigger effects)
  useEffect(() => {
    analysisDataRef.current = analysisData;
  }, [analysisData]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setRecordingMode('recording');
      setTempSegments([]);
      setNextSegmentIndex(1);
      currentSegmentRef.current = null;
      lastProcessedIndexRef.current = 0;
    }
  }, [visible, sequenceId]);

  // Threshold detection for automatic segment creation
  // Optimized: only process when new data points are available
  const dataPointsLength = analysisData?.dataPoints?.length ?? 0;

  useEffect(() => {
    if (!isRecording || isPaused || !dataPointsLength) {
      return;
    }

    // Only process if we have new data points
    if (dataPointsLength <= lastProcessedIndexRef.current) {
      return;
    }

    // Access analysisData from ref to avoid dependency
    const currentAnalysisData = analysisDataRef.current;
    if (!currentAnalysisData?.dataPoints) {
      return;
    }

    // Get latest RMS value from the most recent data point
    const latestPoint = currentAnalysisData.dataPoints[dataPointsLength - 1];
    if (!latestPoint) return;

    lastProcessedIndexRef.current = dataPointsLength;
    const currentLevel = latestPoint.rms ?? 0;
    const startThreshold = RECORDING_CONFIG.start_segment_threshold;
    const endThreshold = RECORDING_CONFIG.end_segment_threshold;

    // Check if we should start a new segment
    if (
      !currentSegmentRef.current?.isActive &&
      currentLevel >= startThreshold
    ) {
      // Start new segment
      const segmentId = generateUUID();
      const now = Date.now();
      currentSegmentRef.current = {
        id: segmentId,
        startTimeMs: now - durationMs,
        startAudioLevel: currentLevel,
        isActive: true,
      };
    }

    // Check if we should end current segment
    if (currentSegmentRef.current?.isActive && currentLevel <= endThreshold) {
      // End segment and create temp segment
      const segment = currentSegmentRef.current;
      const segmentStartTime =
        Date.now() -
        durationMs +
        (segment.startTimeMs - (Date.now() - durationMs));
      const segmentDuration =
        durationMs - (segmentStartTime - (Date.now() - durationMs));
      const segmentDurationSeconds = segmentDuration / 1000;

      if (segmentDurationSeconds > 0.1) {
        // Only create segment if it's longer than 100ms
        const now = new Date().toISOString();
        const relativePath = FilePathService.getRelativePath(
          sequenceId,
          segment.id
        );

        const newSegment: TempSegment = {
          id: segment.id,
          local_file_path: relativePath,
          sequence_id: sequenceId,
          project_id: projectId,
          segment_index: nextSegmentIndex,
          is_hidden: currentLevel < RECORDING_CONFIG.speaker_threshold,
          audio_level: currentLevel,
          duration_seconds: segmentDurationSeconds,
          start_time_ms: segment.startTimeMs,
          end_time_ms: Date.now(),
          recording_status: 'completed',
          created_at: now,
          updated_at: now,
        };

        setTempSegments(prev => [...prev, newSegment]);
        setNextSegmentIndex(prev => prev + 1);
      }

      currentSegmentRef.current = null;
    }
  }, [
    dataPointsLength,
    isRecording,
    isPaused,
    durationMs,
    sequenceId,
    projectId,
    nextSegmentIndex,
  ]);

  const handleStartRecording = useCallback(async (): Promise<void> => {
    try {
      // Ensure directory exists
      await FilePathService.ensureSequenceDirectory(sequenceId);

      // Start recording with config
      // Note: useAudioRecorder handles permissions automatically

      await startRecording({
        sampleRate: RECORDING_CONFIG.sample_rate,
        channels: (RECORDING_CONFIG.channels === 1 ? 1 : 2) as 1 | 2,
        encoding: 'pcm_16bit',
        enableProcessing: true, // Enable for waveform and analysis
        interval: 50, // Update raw audio stream every 50ms
        intervalAnalysis: 50, // Update analysisData every 50ms (20 times per second)
        output: {
          primary: {
            enabled: true,
          },
          compressed: {
            enabled: true,
            format: 'aac',
            bitrate: 128000,
          },
        },
        autoResumeAfterInterruption: true,
        keepAwake: true,
      });

      setRecordingMode('recording');
      currentSegmentRef.current = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start recording:', error);
    }
  }, [sequenceId, startRecording]);

  const handleStopRecording = useCallback(async (): Promise<void> => {
    try {
      // Stop recording and save final segment if active
      const recording = await stopRecording();

      // If there's an active segment, finalize it
      if (currentSegmentRef.current?.isActive && recording) {
        const segment = currentSegmentRef.current;
        const segmentDurationSeconds = recording.durationMs / 1000;
        const now = new Date().toISOString();
        const relativePath = FilePathService.getRelativePath(
          sequenceId,
          segment.id
        );

        // Get latest audio level from analysis
        const latestPoint =
          analysisData?.dataPoints && analysisData.dataPoints.length > 0
            ? analysisData.dataPoints[analysisData.dataPoints.length - 1]
            : null;
        const latestRms = latestPoint?.rms ?? segment.startAudioLevel;

        const newSegment: TempSegment = {
          id: segment.id,
          local_file_path: relativePath,
          sequence_id: sequenceId,
          project_id: projectId,
          segment_index: nextSegmentIndex,
          is_hidden: latestRms < RECORDING_CONFIG.speaker_threshold,
          audio_level: latestRms,
          duration_seconds: segmentDurationSeconds,
          start_time_ms: segment.startTimeMs,
          end_time_ms: Date.now(),
          recording_status: 'completed',
          created_at: now,
          updated_at: now,
        };

        setTempSegments(prev => [...prev, newSegment]);
        setNextSegmentIndex(prev => prev + 1);
      }

      currentSegmentRef.current = null;
      setRecordingMode('edit');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording, analysisData, sequenceId, projectId, nextSegmentIndex]);

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

  const handleToggleHide = useCallback((segmentId: string): void => {
    setTempSegments(prev =>
      prev.map(segment =>
        segment.id === segmentId
          ? { ...segment, is_hidden: !segment.is_hidden }
          : segment
      )
    );
  }, []);

  return {
    // State
    tempSegments,
    recordingMode,
    isRecording,
    isPaused,
    durationMs,
    analysisData,
    // Handlers
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleToggleHide,
    setRecordingMode,
  };
};

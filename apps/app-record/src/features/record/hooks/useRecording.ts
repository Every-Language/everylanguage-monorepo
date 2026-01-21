import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder, trimAudio } from '@siteed/expo-audio-studio';
import * as FileSystem from 'expo-file-system';
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
  // Store segments in ref to access in callbacks
  const segmentsRef = useRef<TempSegment[]>([]);
  // Store main recording URI after stop (for potential re-extraction)
  const mainRecordingUriRef = useRef<string | null>(null);
  // Track if segments have been extracted
  const [segmentsExtracted, setSegmentsExtracted] = useState(false);

  // Update ref when analysisData changes (but don't trigger effects)
  useEffect(() => {
    analysisDataRef.current = analysisData;
  }, [analysisData]);

  // Update segments ref when segments change
  useEffect(() => {
    segmentsRef.current = tempSegments;
  }, [tempSegments]);

  // Helper function to extract segments from main recording
  const extractSegmentsFromRecording = async (
    mainRecordingUri: string,
    segments: TempSegment[]
  ): Promise<void> => {
    if (segments.length === 0 || !mainRecordingUri) {
      // eslint-disable-next-line no-console
      console.log('Skipping extraction:', {
        segmentsCount: segments.length,
        hasMainUri: !!mainRecordingUri,
      });
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('Starting segment extraction:', {
        segmentsCount: segments.length,
        mainRecordingUri,
      });

      // Ensure directory exists
      await FilePathService.ensureSequenceDirectory(sequenceId);

      // Extract each segment from the main recording
      for (const segment of segments) {
        try {
          const absolutePath = FilePathService.getAbsolutePath(
            segment.local_file_path
          );

          // eslint-disable-next-line no-console
          console.log('Extracting segment:', {
            segmentId: segment.id,
            startTimeMs: segment.start_time_ms,
            endTimeMs: segment.end_time_ms,
            targetPath: absolutePath,
          });

          // Extract segment using trimAudio
          // trimAudio requires ranges array when using mode: 'keep'
          const trimmedResult = await trimAudio({
            fileUri: mainRecordingUri,
            ranges: [
              {
                startTimeMs: segment.start_time_ms,
                endTimeMs: segment.end_time_ms,
              },
            ],
            mode: 'keep',
            outputFormat: { format: 'aac' },
          });

          // eslint-disable-next-line no-console
          console.log('trimAudio result:', trimmedResult);

          // Get the trimmed file URI from the result
          // The result might have 'uri' or 'fileUri' property
          let trimmedFileUri =
            (trimmedResult as { uri?: string; fileUri?: string }).uri ||
            (trimmedResult as { uri?: string; fileUri?: string }).fileUri;

          if (!trimmedFileUri) {
            // eslint-disable-next-line no-console
            console.error('No file URI in trimAudio result:', trimmedResult);
            continue;
          }

          // Normalize the path - remove trailing /.. and other path issues
          trimmedFileUri = trimmedFileUri
            .replace(/\/\.\.\/?$/, '')
            .replace(/\/+$/, '');

          // Check if the path is a directory - if so, find the audio file inside
          const sourceInfo = await FileSystem.getInfoAsync(trimmedFileUri);
          if (sourceInfo.exists && sourceInfo.isDirectory) {
            // List files in the directory and find the audio file
            const dirContents =
              await FileSystem.readDirectoryAsync(trimmedFileUri);
            const audioFile = dirContents.find(
              f =>
                f.endsWith('.aac') || f.endsWith('.m4a') || f.endsWith('.wav')
            );
            if (audioFile) {
              trimmedFileUri = `${trimmedFileUri}/${audioFile}`;
            } else {
              // eslint-disable-next-line no-console
              console.error(
                'No audio file found in directory:',
                trimmedFileUri
              );
              continue;
            }
          }

          // eslint-disable-next-line no-console
          console.log('Copying file:', {
            from: trimmedFileUri,
            to: absolutePath,
          });

          // Check if target file already exists and remove it
          const targetExists = await FileSystem.getInfoAsync(absolutePath);
          if (targetExists.exists) {
            await FileSystem.deleteAsync(absolutePath, { idempotent: true });
          }

          // Copy the trimmed file to the segment's path
          // Use copyAsync instead of moveAsync to avoid issues with temp files
          await FileSystem.copyAsync({
            from: trimmedFileUri,
            to: absolutePath,
          });

          // Verify the file was copied successfully
          const copiedFileInfo = await FileSystem.getInfoAsync(absolutePath);
          if (!copiedFileInfo.exists) {
            // eslint-disable-next-line no-console
            console.error(
              'File copy failed, file does not exist:',
              absolutePath
            );
            continue;
          }

          // Clean up the source file if it's in a temp directory
          if (trimmedFileUri.includes('/tmp/')) {
            try {
              await FileSystem.deleteAsync(trimmedFileUri, {
                idempotent: true,
              });
            } catch {
              // Ignore cleanup errors
            }
          }

          // Verify file was created
          const fileInfo = await FileSystem.getInfoAsync(absolutePath);
          if (fileInfo.exists) {
            // eslint-disable-next-line no-console
            console.log('Segment file created successfully:', absolutePath);
          } else {
            // eslint-disable-next-line no-console
            console.error('Segment file not found after move:', absolutePath);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`Failed to extract segment ${segment.id}:`, err);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to extract segments:', err);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setTempSegments([]);
      setNextSegmentIndex(1);
      currentSegmentRef.current = null;
      lastProcessedIndexRef.current = 0;
      mainRecordingUriRef.current = null;
      setSegmentsExtracted(false);
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
      // Start new segment - store time relative to recording start
      const segmentId = generateUUID();
      currentSegmentRef.current = {
        id: segmentId,
        startTimeMs: durationMs, // Time from recording start when segment started
        startAudioLevel: currentLevel,
        isActive: true,
      };
    }

    // Check if we should end current segment
    if (currentSegmentRef.current?.isActive && currentLevel <= endThreshold) {
      // End segment and create temp segment
      const segment = currentSegmentRef.current;
      const segmentStartTimeMs = segment.startTimeMs; // Already relative to recording start
      const segmentEndTimeMs = durationMs; // Current recording duration = end time
      const segmentDurationMs = segmentEndTimeMs - segmentStartTimeMs;
      const segmentDurationSeconds = segmentDurationMs / 1000;

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
          is_hidden: false,
          audio_level: currentLevel,
          duration_seconds: segmentDurationSeconds,
          start_time_ms: segmentStartTimeMs,
          end_time_ms: segmentEndTimeMs,
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

      currentSegmentRef.current = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to start recording:', error);
    }
  }, [sequenceId, startRecording]);

  const handleStopRecording = useCallback(async (): Promise<void> => {
    try {
      // eslint-disable-next-line no-console
      console.log('handleStopRecording called');

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
      mainRecordingUriRef.current = mainRecordingUri;

      // If there's an active segment, finalize it
      if (currentSegmentRef.current?.isActive) {
        const segment = currentSegmentRef.current;
        const segmentStartTimeMs = segment.startTimeMs; // Relative to recording start
        const segmentEndTimeMs = recording.durationMs; // Final recording duration
        const segmentDurationMs = segmentEndTimeMs - segmentStartTimeMs;
        const segmentDurationSeconds = segmentDurationMs / 1000;
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
          is_hidden: false,
          audio_level: latestRms,
          duration_seconds: segmentDurationSeconds,
          start_time_ms: segmentStartTimeMs,
          end_time_ms: segmentEndTimeMs,
          recording_status: 'completed',
          created_at: now,
          updated_at: now,
        };

        // Add final segment
        setTempSegments(prev => [...prev, newSegment]);
        setNextSegmentIndex(prev => prev + 1);

        // Extract all segments including the new one
        const allSegments = [...segmentsRef.current, newSegment];
        // eslint-disable-next-line no-console
        console.log('Extracting segments (with final):', {
          segmentCount: allSegments.length,
          segments: allSegments.map(s => ({
            id: s.id,
            startTimeMs: s.start_time_ms,
            endTimeMs: s.end_time_ms,
          })),
        });
        await extractSegmentsFromRecording(mainRecordingUri, allSegments);
        setSegmentsExtracted(true);
      } else {
        // Extract segments for existing ones (no final segment was active)
        // eslint-disable-next-line no-console
        console.log('Extracting segments (no final):', {
          segmentCount: segmentsRef.current.length,
          segments: segmentsRef.current.map(s => ({
            id: s.id,
            startTimeMs: s.start_time_ms,
            endTimeMs: s.end_time_ms,
          })),
        });
        await extractSegmentsFromRecording(
          mainRecordingUri,
          segmentsRef.current
        );
        setSegmentsExtracted(true);
      }

      currentSegmentRef.current = null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to stop recording:', error);
    }
  }, [
    stopRecording,
    analysisData,
    sequenceId,
    projectId,
    nextSegmentIndex,
    extractSegmentsFromRecording,
  ]);

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

  // Cleanup extracted files if user cancels
  const handleCleanup = useCallback(async (): Promise<void> => {
    if (segmentsExtracted && tempSegments.length > 0) {
      try {
        for (const segment of tempSegments) {
          try {
            await FilePathService.deleteFile(segment.local_file_path);
          } catch (err) {
            // Ignore individual file deletion errors
            // eslint-disable-next-line no-console
            console.warn(`Failed to delete segment file ${segment.id}:`, err);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to cleanup segment files:', error);
      }
    }
    // Clean up main recording file if it exists
    if (mainRecordingUriRef.current) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(
          mainRecordingUriRef.current
        );
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(mainRecordingUriRef.current, {
            idempotent: true,
          });
        }
      } catch (err) {
        // Ignore cleanup errors for main recording
        // eslint-disable-next-line no-console
        console.warn('Failed to cleanup main recording file:', err);
      }
    }
  }, [segmentsExtracted, tempSegments]);

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
    handleCleanup,
  };
};

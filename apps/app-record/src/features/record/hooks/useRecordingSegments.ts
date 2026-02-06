import { useState, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { extractAudioAnalysis } from '@siteed/expo-audio-studio';
import { useRecordingSettingsStore } from '../stores/recording-settings-store';
import {
  RecordingSegmentService,
  generateSegmentId,
} from '../services/recording-segment-service';
import type { TempSegment } from '../types';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

interface CurrentSegmentState {
  id: string;
  startTimeMs: number;
  startAudioLevel: number;
  isActive: boolean;
}

/**
 * Hook for managing segment detection during recording
 *
 * Handles real-time threshold detection and segment creation.
 */
export const useRecordingSegments = (
  sequenceId: string,
  projectId: string,
  isRecording: boolean,
  isPaused: boolean,
  durationMs: number,
  analysisData: AudioAnalysis | undefined
) => {
  const [tempSegments, setTempSegments] = useState<TempSegment[]>([]);
  const [nextSegmentIndex, setNextSegmentIndex] = useState(1);

  // Get threshold values from store
  const { startThreshold, endThreshold, endThresholdSustainMs } =
    useRecordingSettingsStore(
      useShallow(state => ({
        startThreshold: state.startThreshold,
        endThreshold: state.endThreshold,
        endThresholdSustainMs: state.endThresholdSustainMs,
      }))
    );

  // Track current segment state
  const currentSegmentRef = useRef<CurrentSegmentState | null>(null);
  // Track last processed point ID to avoid reprocessing same point
  // When reference changes, check if point ID changed before processing
  const lastProcessedPointIdRef = useRef<number | undefined>(undefined);
  const lastProcessedLengthRef = useRef<number>(0);
  // Track consecutive data points below end threshold for sustain logic
  const pendingEndCountRef = useRef<number>(0);
  // Store current analysisData in ref to avoid dependency issues
  const analysisDataRef = useRef(analysisData);
  // Store segments in ref to access in callbacks
  const segmentsRef = useRef<TempSegment[]>([]);

  // Update ref when analysisData changes
  useEffect(() => {
    analysisDataRef.current = analysisData;
  }, [analysisData]);

  // Update segments ref when segments change
  useEffect(() => {
    segmentsRef.current = tempSegments;
  }, [tempSegments]);

  // Reset state
  const resetSegments = useCallback(() => {
    setTempSegments([]);
    setNextSegmentIndex(1);
    currentSegmentRef.current = null;
    lastProcessedPointIdRef.current = undefined;
    lastProcessedLengthRef.current = 0;
    pendingEndCountRef.current = 0;
  }, []);

  // Threshold detection for automatic segment creation
  const dataPointsLength = analysisData?.dataPoints?.length ?? 0;

  useEffect(() => {
    if (!isRecording || isPaused || !dataPointsLength) {
      return;
    }

    // Access analysisData from ref to avoid dependency
    const currentAnalysisData = analysisDataRef.current;
    if (!currentAnalysisData?.dataPoints) {
      return;
    }

    const lastProcessedPointId = lastProcessedPointIdRef.current;

    // Find all unprocessed points (points with ID > lastProcessedPointId)
    // This handles both growing arrays and rolling buffers
    const unprocessedPoints: Array<{
      point: (typeof currentAnalysisData.dataPoints)[0];
      index: number;
    }> = [];

    for (let i = 0; i < currentAnalysisData.dataPoints.length; i++) {
      const point = currentAnalysisData.dataPoints[i];
      if (!point) continue;

      // If we haven't processed any points yet, or this point is newer
      if (
        lastProcessedPointId === undefined ||
        point.id > lastProcessedPointId
      ) {
        unprocessedPoints.push({ point, index: i });
      }
    }

    // If no new points, skip processing
    if (unprocessedPoints.length === 0) {
      return;
    }

    // Calculate how many data points we need to sustain below threshold
    // Each data point is ~50ms (intervalAnalysis), so divide sustainMs by 50
    const requiredDataPoints = Math.ceil(endThresholdSustainMs / 50);

    // Process each unprocessed point sequentially
    // This ensures we don't miss any below-threshold points
    for (const { point } of unprocessedPoints) {
      const currentPointId = point.id;
      const currentLevel = point.rms ?? 0;

      // Update tracking refs for this point
      lastProcessedPointIdRef.current = currentPointId;
      lastProcessedLengthRef.current = dataPointsLength;

      // Check if we should start a new segment
      if (
        !currentSegmentRef.current?.isActive &&
        currentLevel >= startThreshold
      ) {
        // Start new segment
        const segmentId = generateSegmentId();
        currentSegmentRef.current = {
          id: segmentId,
          startTimeMs: durationMs,
          startAudioLevel: currentLevel,
          isActive: true,
        };
        // Reset pending end count when starting a new segment
        pendingEndCountRef.current = 0;
      }

      // Check if we should end current segment (with sustain logic)
      if (currentSegmentRef.current?.isActive) {
        if (currentLevel <= endThreshold) {
          // Increment counter for consecutive below-threshold points
          pendingEndCountRef.current += 1;

          // Only end if we've been below threshold for the required duration
          if (pendingEndCountRef.current >= requiredDataPoints) {
            // End segment and create temp segment
            const segment = currentSegmentRef.current;
            const segmentStartTimeMs = segment.startTimeMs;
            const segmentEndTimeMs = durationMs;
            const segmentDurationSeconds =
              (segmentEndTimeMs - segmentStartTimeMs) / 1000;

            if (segmentDurationSeconds > 0.1) {
              // Only create segment if it's longer than 100ms
              const newSegment = RecordingSegmentService.createTempSegment(
                segment.id,
                segmentStartTimeMs,
                segmentEndTimeMs,
                currentLevel,
                sequenceId,
                projectId,
                nextSegmentIndex
              );

              setTempSegments(prev => [...prev, newSegment]);
              setNextSegmentIndex(prev => prev + 1);
            }

            currentSegmentRef.current = null;
            pendingEndCountRef.current = 0;
            // Break out of loop since segment ended
            break;
          }
        } else {
          // Audio level went back above threshold, reset pending end count
          pendingEndCountRef.current = 0;
        }
      }
    }
  }, [
    dataPointsLength,
    isRecording,
    isPaused,
    durationMs,
    sequenceId,
    projectId,
    nextSegmentIndex,
    startThreshold,
    endThreshold,
    endThresholdSustainMs,
  ]);

  // Finalize active segment if recording stops
  const finalizeActiveSegment = useCallback(
    (recordingDurationMs: number, latestRms?: number): TempSegment | null => {
      if (!currentSegmentRef.current?.isActive) {
        return null;
      }

      const segment = currentSegmentRef.current;
      const latestPoint =
        analysisData?.dataPoints && analysisData.dataPoints.length > 0
          ? analysisData.dataPoints[analysisData.dataPoints.length - 1]
          : null;
      const audioLevel =
        latestPoint?.rms ?? latestRms ?? segment.startAudioLevel;

      const newSegment = RecordingSegmentService.createTempSegment(
        segment.id,
        segment.startTimeMs,
        recordingDurationMs,
        audioLevel,
        sequenceId,
        projectId,
        nextSegmentIndex
      );

      setTempSegments(prev => [...prev, newSegment]);
      setNextSegmentIndex(prev => prev + 1);
      currentSegmentRef.current = null;

      return newSegment;
    },
    [analysisData, sequenceId, projectId, nextSegmentIndex]
  );

  // Detect segments from post-recording analysis (fallback)
  const detectSegmentsFromPostAnalysis = useCallback(
    async (
      mainRecordingUri: string,
      recordingDurationMs: number
    ): Promise<TempSegment[]> => {
      try {
        const postAnalysis = await extractAudioAnalysis({
          fileUri: mainRecordingUri,
          segmentDurationMs: 50,
        });

        const fallbackSegments =
          RecordingSegmentService.detectSegmentsFromPostAnalysis(
            postAnalysis,
            recordingDurationMs,
            startThreshold,
            endThreshold,
            sequenceId,
            projectId
          );

        if (fallbackSegments.length > 0) {
          setTempSegments(fallbackSegments);
          setNextSegmentIndex(fallbackSegments.length + 1);
        }

        return fallbackSegments;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Post-recording analysis fallback failed:', err);
        return [];
      }
    },
    [sequenceId, projectId, startThreshold, endThreshold]
  );

  return {
    tempSegments,
    nextSegmentIndex,
    segmentsRef,
    currentSegmentRef,
    resetSegments,
    finalizeActiveSegment,
    detectSegmentsFromPostAnalysis,
  };
};

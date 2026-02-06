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
  const { startThreshold, endThreshold } = useRecordingSettingsStore(
    useShallow(state => ({
      startThreshold: state.startThreshold,
      endThreshold: state.endThreshold,
    }))
  );

  // Track current segment state
  const currentSegmentRef = useRef<CurrentSegmentState | null>(null);
  // Track last processed data point index to avoid reprocessing
  const lastProcessedIndexRef = useRef<number>(0);
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
    lastProcessedIndexRef.current = 0;
  }, []);

  // Threshold detection for automatic segment creation
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
    }

    // Check if we should end current segment
    if (currentSegmentRef.current?.isActive && currentLevel <= endThreshold) {
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

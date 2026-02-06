import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAudioRecorder,
  ExpoAudioStreamModule,
} from '@siteed/expo-audio-studio';
import { RECORDING_CONFIG } from '../constants/recordingConfig';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

export interface UseAudioMonitorReturn {
  analysisData: AudioAnalysis | undefined;
  isMonitoring: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  error: Error | null;
}

/**
 * Hook for monitoring audio input without recording to file
 *
 * Uses useAudioRecorder with output disabled to get live analysis data
 * without creating audio files.
 */
export const useAudioMonitor = (): UseAudioMonitorReturn => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const recordingFileUriRef = useRef<string | null>(null);
  const isStoppingRef = useRef(false); // Guard against concurrent stop calls

  const { startRecording, stopRecording, isRecording, analysisData } =
    useAudioRecorder();

  const startMonitoring = useCallback(async (): Promise<void> => {
    // Prevent duplicate calls - if already monitoring or recording, return early
    if (isMonitoring || isRecording) {
      return;
    }
    try {
      setError(null);

      // Request microphone permissions
      const { status } = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Start recording with output disabled (monitor-only mode)
      const recordingConfig = {
        sampleRate: RECORDING_CONFIG.sample_rate,
        channels: (RECORDING_CONFIG.channels === 1 ? 1 : 2) as 1 | 2,
        encoding: 'pcm_16bit' as const,
        enableProcessing: true, // Enable analysis
        interval: 50,
        intervalAnalysis: 50,
        output: {
          primary: {
            enabled: false, // Don't create WAV file
          },
          compressed: {
            enabled: false, // Don't create compressed file
          },
        },
        autoResumeAfterInterruption: false,
        keepAwake: false, // Don't keep screen awake for monitoring
      };

      const result = await startRecording(recordingConfig);

      // Store file URI if one was created (fallback case)
      if (result?.fileUri) {
        recordingFileUriRef.current = result.fileUri;
      }

      setIsMonitoring(true);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to start monitoring');
      setError(error);
      // eslint-disable-next-line no-console
      console.error('Failed to start audio monitoring:', error);
      throw error;
    }
  }, [startRecording, isMonitoring, isRecording]);

  const stopMonitoring = useCallback(async (): Promise<void> => {
    // Prevent concurrent stop calls
    if (isStoppingRef.current) {
      return;
    }
    try {
      // Only stop if we're actually monitoring and recording is active
      if (!isMonitoring || !isRecording) {
        setIsMonitoring(false);
        return;
      }

      isStoppingRef.current = true;

      const result = await stopRecording();

      // Clean up file if one was created (fallback case)
      if (result?.fileUri || recordingFileUriRef.current) {
        const fileUri = result?.fileUri || recordingFileUriRef.current;
        if (fileUri) {
          try {
            const { deleteAsync } = await import('expo-file-system');
            await deleteAsync(fileUri, { idempotent: true });
          } catch {
            // Ignore cleanup errors
          }
          recordingFileUriRef.current = null;
        }
      }

      setIsMonitoring(false);
      setError(null);
      isStoppingRef.current = false;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to stop monitoring');
      setError(error);
      // eslint-disable-next-line no-console
      console.error('Failed to stop audio monitoring:', error);
      // Still set monitoring to false even if stop fails
      setIsMonitoring(false);
      isStoppingRef.current = false;
    }
  }, [isMonitoring, isRecording, startRecording, stopRecording]);

  // Store state in refs for cleanup function
  const isMonitoringRef = useRef(isMonitoring);
  const isRecordingRef = useRef(isRecording);
  const stopMonitoringRef = useRef(stopMonitoring);

  // Update refs when values change
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  useEffect(() => {
    stopMonitoringRef.current = stopMonitoring;
  }, [stopMonitoring]);

  // Cleanup on unmount only (not on isMonitoring change)
  useEffect(() => {
    return () => {
      // Only cleanup on unmount, not when isMonitoring changes
      // The parent component (useRecordingSettings) handles lifecycle
      // Use refs to get latest values without dependencies
      if (isMonitoringRef.current || isRecordingRef.current) {
        stopMonitoringRef.current().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, []); // Empty deps - only run cleanup on unmount

  return {
    analysisData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    error,
  };
};

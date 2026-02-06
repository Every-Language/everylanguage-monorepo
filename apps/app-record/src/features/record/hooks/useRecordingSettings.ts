import { useEffect, useRef } from 'react';
import { useRecordingSettingsStore } from '../stores/recording-settings-store';
import { useAudioMonitor } from './useAudioMonitor';
import type { AudioAnalysis } from '@siteed/expo-audio-studio';

export interface UseRecordingSettingsReturn {
  startThreshold: number;
  endThreshold: number;
  setStartThreshold: (threshold: number) => void;
  setEndThreshold: (threshold: number) => void;
  resetToDefaults: () => void;
  analysisData: AudioAnalysis | undefined;
  isMonitoring: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  error: Error | null;
}

/**
 * Hook for managing recording settings with live audio monitoring
 *
 * Combines the settings store with audio monitoring capabilities.
 * Manages monitoring lifecycle based on modal visibility.
 */
export const useRecordingSettings = (
  isModalVisible: boolean
): UseRecordingSettingsReturn => {
  const {
    startThreshold,
    endThreshold,
    setStartThreshold,
    setEndThreshold,
    resetToDefaults,
  } = useRecordingSettingsStore();

  const { analysisData, isMonitoring, startMonitoring, stopMonitoring, error } =
    useAudioMonitor();

  // Track if we're currently starting/stopping to prevent concurrent calls
  const isTransitioningRef = useRef(false);
  // Store callbacks in refs to avoid effect re-runs when they change
  const startMonitoringRef = useRef(startMonitoring);
  const stopMonitoringRef = useRef(stopMonitoring);

  // Update refs when callbacks change
  useEffect(() => {
    startMonitoringRef.current = startMonitoring;
    stopMonitoringRef.current = stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Start monitoring when modal opens, stop when it closes
  useEffect(() => {
    // Prevent concurrent calls
    if (isTransitioningRef.current) {
      return;
    }

    if (isModalVisible && !isMonitoring) {
      isTransitioningRef.current = true;
      startMonitoringRef
        .current()
        .catch(() => {
          // Error is handled by useAudioMonitor
        })
        .finally(() => {
          isTransitioningRef.current = false;
        });
    } else if (!isModalVisible && isMonitoring) {
      isTransitioningRef.current = true;
      stopMonitoringRef
        .current()
        .catch(() => {
          // Error is handled by useAudioMonitor
        })
        .finally(() => {
          isTransitioningRef.current = false;
        });
    }
  }, [isModalVisible, isMonitoring]); // Removed startMonitoring/stopMonitoring from deps

  return {
    startThreshold,
    endThreshold,
    setStartThreshold,
    setEndThreshold,
    resetToDefaults,
    analysisData,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    error,
  };
};

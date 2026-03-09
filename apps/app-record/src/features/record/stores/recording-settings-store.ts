import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECORDING_CONFIG } from '../constants/recordingConfig';

// Types
export type MeasurementType = 'db' | 'rms';

export interface RecordingSettingsState {
  startThreshold: number;
  endThreshold: number;
  endThresholdSustainMs: number;
  measurementType: MeasurementType;
}

export interface RecordingSettingsActions {
  setStartThreshold: (threshold: number) => void;
  setEndThreshold: (threshold: number) => void;
  setEndThresholdSustainMs: (sustainMs: number) => void;
  setMeasurementType: (type: MeasurementType) => void;
  resetToDefaults: () => void;
}

export type RecordingSettingsStore = RecordingSettingsState &
  RecordingSettingsActions;

// Store
export const useRecordingSettingsStore = create<RecordingSettingsStore>()(
  persist(
    set => ({
      // Initial state (defaults from RECORDING_CONFIG)
      startThreshold: RECORDING_CONFIG.start_segment_threshold,
      endThreshold: RECORDING_CONFIG.end_segment_threshold,
      endThresholdSustainMs: RECORDING_CONFIG.end_threshold_sustain_ms,
      measurementType: 'rms' as MeasurementType,

      // Actions
      setStartThreshold: (threshold: number) => {
        // Clamp to valid range (0 to 0.4)
        const clamped = Math.max(0, Math.min(0.4, threshold));
        set({ startThreshold: clamped });
      },

      setEndThreshold: (threshold: number) => {
        // Clamp to valid range (0 to 0.4)
        const clamped = Math.max(0, Math.min(0.4, threshold));
        set({ endThreshold: clamped });
      },

      setEndThresholdSustainMs: (sustainMs: number) => {
        // Clamp to valid range (50 to 500ms)
        const clamped = Math.max(50, Math.min(500, sustainMs));
        set({ endThresholdSustainMs: clamped });
      },

      setMeasurementType: (type: MeasurementType) => {
        set({ measurementType: type });
      },

      resetToDefaults: () => {
        set({
          startThreshold: RECORDING_CONFIG.start_segment_threshold,
          endThreshold: RECORDING_CONFIG.end_segment_threshold,
          endThresholdSustainMs: RECORDING_CONFIG.end_threshold_sustain_ms,
          measurementType: 'rms' as MeasurementType,
        });
      },
    }),
    {
      name: 'app-record-recording-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist threshold values, sustain time, and measurement type
      partialize: state => ({
        startThreshold: state.startThreshold,
        endThreshold: state.endThreshold,
        endThresholdSustainMs: state.endThresholdSustainMs,
        measurementType: state.measurementType,
      }),
    }
  )
);

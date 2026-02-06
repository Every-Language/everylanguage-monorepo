import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECORDING_CONFIG } from '../constants/recordingConfig';

// Types
export interface RecordingSettingsState {
  startThreshold: number;
  endThreshold: number;
}

export interface RecordingSettingsActions {
  setStartThreshold: (threshold: number) => void;
  setEndThreshold: (threshold: number) => void;
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

      resetToDefaults: () => {
        set({
          startThreshold: RECORDING_CONFIG.start_segment_threshold,
          endThreshold: RECORDING_CONFIG.end_segment_threshold,
        });
      },
    }),
    {
      name: 'app-record-recording-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist threshold values
      partialize: state => ({
        startThreshold: state.startThreshold,
        endThreshold: state.endThreshold,
      }),
    }
  )
);

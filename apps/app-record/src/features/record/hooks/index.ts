// Legacy hooks (deprecated - use API layer instead)
export { useSegments } from './useSegments';
export { useSequenceChapterInfo } from './useSequenceChapterInfo';
export { useSequence } from './useSequence';
export { useRecordingMutations } from './useRecordingMutations';

// Active hooks
export { useRecording } from './useRecording';
export { useRecordingSettings } from './useRecordingSettings';
export type { UseRecordingSettingsReturn } from './useRecordingSettings';
export { useAudioMonitor } from './useAudioMonitor';
export type { UseAudioMonitorReturn } from './useAudioMonitor';
export { useRecordingSegments } from './useRecordingSegments';
export { useRecordingFileOperations } from './useRecordingFileOperations';

// Types
export type { Segment } from '../types';
export type { SequenceChapterInfo } from './useSequenceChapterInfo';

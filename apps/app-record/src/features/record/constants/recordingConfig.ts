/**
 * Recording configuration constants
 *
 * Default values for audio recording settings.
 * These are static defaults used throughout the recording feature.
 */
export const RECORDING_CONFIG = {
  start_segment_threshold: 0.1,
  end_segment_threshold: 0.05,
  start_padding_ms: 500,
  end_padding_ms: 500,
  speaker_threshold: 0.08,
  sample_rate: 44100,
  channels: 1, // Mono for speech
  bit_depth: 16,
} as const;

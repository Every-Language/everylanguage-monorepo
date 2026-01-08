/**
 * Audio utility functions for react-native-track-player implementation
 */

/**
 * Validate and sanitize time values for audio playback
 * @param time - Time value to validate
 * @returns Sanitized time value
 */
export const sanitizeTime = (time: number): number => {
  if (isNaN(time) || !isFinite(time)) {
    return 0;
  }
  return Math.max(0, time);
};

/**
 * Time formatting and duration utilities
 */

/**
 * Format seconds into MM:SS format
 */
export const formatSeconds = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate effective duration with fallback logic
 * RNTP sometimes reports duration=0 for streaming sources. Fallback to track metadata duration.
 */
export const calculateEffectiveDuration = (
  rntpDuration: number,
  trackDuration?: number
): number => {
  const rntpDurationValid =
    Number.isFinite(rntpDuration) && rntpDuration > 0 ? rntpDuration : 0;
  const trackDurationValid = Number.isFinite(trackDuration)
    ? (trackDuration as number)
    : 0;
  return rntpDurationValid > 0 ? rntpDurationValid : trackDurationValid;
};

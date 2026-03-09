/**
 * Convert audio level (RMS, 0-1) to decibels
 *
 * @param level - Audio level in 0-1 range (RMS)
 * @returns Audio level in dB (-34 to 0)
 */
export const rmsToDb = (level: number): number => {
  // Convert linear 0-1 to approximate dB scale (-34 to 0)
  // Using a logarithmic approximation
  if (level === 0) return -34;
  return Math.max(-34, 20 * Math.log10(level));
};

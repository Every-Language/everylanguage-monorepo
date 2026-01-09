/**
 * Speed/rate formatting utilities
 */

import type { PlaybackRate } from '../constants/playback';

/**
 * Format playback rate for display (removes .00 suffix)
 */
export const getSpeedDisplay = (playbackRate: PlaybackRate): string => {
  return `${playbackRate.toFixed(2).replace(/\.00$/, '')}x`;
};

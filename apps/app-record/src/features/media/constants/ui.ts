/**
 * UI constants for media controls
 */

export const ICON_SIZES = {
  CONTROL_BUTTON: { compact: 24, normal: 32 },
  PLAY_BUTTON: { compact: 28, normal: 40 },
} as const;

export const BUTTON_SIZES = {
  PLAY_BUTTON: { width: 56, height: 56, borderRadius: 28 },
  ALBUM_ART: { width: 60, height: 60, borderRadius: 8 },
} as const;

export const SPACING = {
  SPACER_24: 24,
  HIT_SLOP: 12,
  SEEK_HEAD_OFFSET: -8, // Center the seek head (16px)
} as const;

export const PROGRESS_BAR = {
  CONTAINER_HEIGHT: 24, // larger touch target
  BAR_HEIGHT: 2,
  SEEK_HEAD: { width: 16, height: 16, borderRadius: 8 },
  SEEK_HEAD_TOP: 4, // Center knob positioning
} as const;

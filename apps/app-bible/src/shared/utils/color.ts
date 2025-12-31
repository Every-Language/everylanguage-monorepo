import { BRAND_COLORS } from '@everylanguage/shared-native-ui';
import type { ThemeMode } from '@everylanguage/shared-native-ui';

export const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getMaterialOverlayColor = (mode: ThemeMode): string =>
  mode === 'dark'
    ? hexToRgba(BRAND_COLORS.CHARCOAL, 0.44)
    : hexToRgba(BRAND_COLORS.CREAM, 0.26);

// Color helpers for gradient derivation
export const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

export const mixHexColors = (
  colorA: string,
  colorB: string,
  weight: number
): string => {
  const w = clamp01(weight);
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r * (1 - w) + b.r * w);
  const g = Math.round(a.g * (1 - w) + b.g * w);
  const bl = Math.round(a.b * (1 - w) + b.b * w);
  return rgbToHex(r, g, bl);
};

export const hslToHex = (h: number, s: number, l: number): string => {
  // h [0,360], s/l [0,1]
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) {
    r = c;
    g = x;
  } else if (hp >= 1 && hp < 2) {
    r = x;
    g = c;
  } else if (hp >= 2 && hp < 3) {
    g = c;
    b = x;
  } else if (hp >= 3 && hp < 4) {
    g = x;
    b = c;
  } else if (hp >= 4 && hp < 5) {
    r = x;
    b = c;
  } else if (hp >= 5 && hp <= 6) {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  const toByte = (v: number) => Math.round((v + m) * 255);
  return rgbToHex(toByte(r), toByte(g), toByte(b));
};

export const stringToHslWarmHex = (seed: string, mode: ThemeMode): string => {
  // Create a deterministic hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);

    hash |= 0; // Convert to 32bit int
  }
  const abs = Math.abs(hash);
  // Warm hue range ~ 20-50 (golden/brown/amber)
  const hue = 20 + (abs % 31); // 20..51
  const sat = mode === 'dark' ? 0.55 : 0.5;
  const lig = mode === 'dark' ? 0.25 : 0.7;
  return hslToHex(hue, sat, lig);
};

export const deriveAlbumAccentHex = (
  seed: string | undefined,
  mode: ThemeMode
): string => {
  if (!seed) {
    return mode === 'dark' ? BRAND_COLORS.CHARCOAL : BRAND_COLORS.CREAM;
  }
  return stringToHslWarmHex(seed, mode);
};

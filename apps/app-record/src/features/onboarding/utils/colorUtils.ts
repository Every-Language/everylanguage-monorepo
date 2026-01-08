import { Theme } from '@/shared/types/theme';

export const getContrastTextColor = (backgroundColor: string, theme: Theme) => {
  // Handle theme colors that might not be hex
  if (!backgroundColor.startsWith('#')) {
    // For theme colors, use a safe fallback based on theme mode
    return theme.colors.textInverse;
  }

  // Convert hex to RGB and calculate luminance
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) {
    return theme.colors.textInverse;
  }

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Check for invalid values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return theme.colors.textInverse;
  }

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? theme.colors.text : theme.colors.textInverse;
};

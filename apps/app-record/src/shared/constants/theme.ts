import type {
  Theme,
  ThemeColors,
  ThemeSpacing,
  ThemeTypography,
  ThemeBorderRadius,
} from '../types/theme';

// Brand Colors
export const BRAND_COLORS = {
  CREAM: '#ebe5d9',
  WHITE: '#ffffff',
  GOLD: '#ad915a',
  LIGHT_BLUE: '#92bec3',
  ALMOST_BLACK: '#070707',
  DARK_GREY: '#282827',
} as const;

// Light Theme Colors
const lightColors: ThemeColors = {
  // Primary brand colors
  primary: BRAND_COLORS.GOLD,
  secondary: BRAND_COLORS.LIGHT_BLUE,
  accent: BRAND_COLORS.GOLD,
  accent2: BRAND_COLORS.LIGHT_BLUE,

  // Background colors
  background: BRAND_COLORS.CREAM,
  surface: BRAND_COLORS.WHITE,
  surfaceVariant: BRAND_COLORS.WHITE,
  modalBackground: BRAND_COLORS.WHITE,

  // Text colors
  text: BRAND_COLORS.ALMOST_BLACK,
  textSecondary: '#666666',
  textInverse: BRAND_COLORS.WHITE,

  // UI colors
  border: 'rgba(0, 0, 0, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.1)',
  surfaceOverlay: 'rgba(0, 0, 0, 0.15)',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Interactive colors
  interactive: BRAND_COLORS.GOLD,
  interactiveHover: '#c4a76a',
  interactivePressed: '#8a7143',
  interactiveDisabled: '#D1D5DB',
};

// Dark Theme Colors
const darkColors: ThemeColors = {
  // Primary brand colors
  primary: BRAND_COLORS.GOLD,
  secondary: BRAND_COLORS.LIGHT_BLUE,
  accent: BRAND_COLORS.GOLD,
  accent2: BRAND_COLORS.LIGHT_BLUE,

  // Background colors
  background: BRAND_COLORS.ALMOST_BLACK,
  surface: BRAND_COLORS.DARK_GREY,
  surfaceVariant: BRAND_COLORS.DARK_GREY,
  modalBackground: BRAND_COLORS.DARK_GREY,

  // Text colors
  text: BRAND_COLORS.CREAM,
  textSecondary: '#a0a0a0',
  textInverse: BRAND_COLORS.ALMOST_BLACK,

  // UI colors
  border: 'rgba(255, 255, 255, 0.1)',
  shadow: 'rgba(0, 0, 0, 0.25)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  surfaceOverlay: 'rgba(255, 255, 255, 0.2)',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Interactive colors
  interactive: BRAND_COLORS.GOLD,
  interactiveHover: '#c4a76a',
  interactivePressed: '#8a7143',
  interactiveDisabled: '#4B5563',
};

// Spacing system
export const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography system
export const typography: ThemeTypography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 36,
  },
};

// Border radius system
export const borderRadius: ThemeBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Light Theme
export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  typography,
  borderRadius,
};

// Dark Theme
export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  typography,
  borderRadius,
};

// Theme map for easy access
export const themes: Record<'light' | 'dark', Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

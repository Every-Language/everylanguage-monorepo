export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Primary brand colors
  primary: string;
  secondary: string;
  accent: string;
  accent2: string;

  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;
  modalBackground: string;

  // Text colors
  text: string;
  textSecondary: string;
  textInverse: string;

  // UI colors
  border: string;
  shadow: string;
  overlay: string;
  surfaceOverlay: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Interactive colors
  interactive: string;
  interactiveHover: string;
  interactivePressed: string;
  interactiveDisabled: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  lineHeight: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

export interface ThemeBorderRadius {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borderRadius: ThemeBorderRadius;
}

export interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

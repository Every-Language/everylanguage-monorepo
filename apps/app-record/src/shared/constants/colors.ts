/**
 * Color constants for the app
 * Centralized color definitions to avoid hardcoded color literals
 */
export const colors = {
  // Base colors
  white: '#fff',
  black: '#000',

  // Grays
  grayLight: '#f5f5f5',
  gray: '#666',
  grayBorder: '#ddd',

  // Primary colors
  primary: '#007AFF',
  primaryDark: '#0051D5',

  // Status colors
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',

  // Text colors
  textPrimary: '#000',
  textSecondary: '#666',
  textOnPrimary: '#fff',
} as const;

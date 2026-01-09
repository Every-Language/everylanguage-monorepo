import { ViewStyle, TextStyle, ImageStyle, StyleSheet } from 'react-native';
import { Theme } from '@/shared/types/theme';

// Type for style functions that take theme as parameter
export type ThemedStyle<T> = (theme: Theme) => T;

// Type for style objects that can be themed
export type StyleType = ViewStyle | TextStyle | ImageStyle;

// Create themed styles similar to StyleSheet.create but with theme support
export function createThemedStyles<
  T extends StyleSheet.NamedStyles<T>,
>(styles: { [K in keyof T]: ThemedStyle<T[K]> }) {
  return (theme: Theme): T => {
    const themedStyles = {} as T;

    for (const key in styles) {
      themedStyles[key] = styles[key](theme);
    }

    return themedStyles;
  };
}

// Helper function to get text styles based on theme
export function getTextStyle(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'inverse' = 'primary'
): TextStyle {
  const colorMap = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    inverse: theme.colors.textInverse,
  };

  return {
    color: colorMap[variant],
    fontFamily: theme.typography.fontFamily.regular,
  };
}

// Helper function to get interactive styles for buttons/touchables
export function getInteractiveStyle(
  theme: Theme,
  state: 'default' | 'hover' | 'pressed' | 'disabled' = 'default'
): ViewStyle {
  const colorMap = {
    default: theme.colors.interactive,
    hover: theme.colors.interactiveHover,
    pressed: theme.colors.interactivePressed,
    disabled: theme.colors.interactiveDisabled,
  };

  return {
    backgroundColor: colorMap[state],
  };
}

// Helper function to get background styles
export function getBackgroundStyle(
  theme: Theme,
  variant: 'primary' | 'surface' | 'surfaceVariant' = 'primary'
): ViewStyle {
  const colorMap = {
    primary: theme.colors.background,
    surface: theme.colors.surface,
    surfaceVariant: theme.colors.surfaceVariant,
  };

  return {
    backgroundColor: colorMap[variant],
  };
}

// Helper function to determine StatusBar style based on theme
export function getStatusBarStyle(
  theme: Theme
): 'light-content' | 'dark-content' {
  return theme.mode === 'dark' ? 'light-content' : 'dark-content';
}

// Helper function to determine StatusBar style with system mode support
export function getStatusBarStyleWithSystem(
  mode: 'light' | 'dark' | 'system',
  systemScheme: 'light' | 'dark'
): 'light-content' | 'dark-content' {
  const effectiveMode = mode === 'system' ? systemScheme : mode;
  return effectiveMode === 'dark' ? 'light-content' : 'dark-content';
}

// Helper function to get themed overlay styles
export function getOverlayStyle(
  theme: Theme,
  opacity: number = 0.5
): ViewStyle {
  return {
    backgroundColor: theme.colors.overlay,
    opacity,
  };
}

// Utility to create responsive spacing
export function getResponsiveSpacing(
  theme: Theme,
  size: keyof Theme['spacing']
) {
  return theme.spacing[size];
}

// Utility to create responsive typography
export function getResponsiveTypography(
  theme: Theme,
  size: keyof Theme['typography']['fontSize']
): TextStyle {
  return {
    fontSize: theme.typography.fontSize[size],
    lineHeight: theme.typography.lineHeight[size],
  };
}

// Utility to create themed button styles
export function getButtonStyle(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary'
): ViewStyle {
  const baseStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.interactive,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.surface,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    default:
      return baseStyle;
  }
}

// Utility to get a cross-platform shadow/elevation style
export function getShadowStyle(
  _theme: Theme,
  elevation: number = 2
): ViewStyle {
  const clamped = Math.max(0, Math.min(24, elevation));
  const opacity = 0.15 + Math.min(clamped, 10) * 0.02;
  return {
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: clamped },
    shadowOpacity: opacity,
    shadowRadius: clamped * 1.5,
    // Android elevation
    elevation: clamped,
  } as ViewStyle;
}

// Utility to create themed input styles
export function getInputStyle(theme: Theme): TextStyle {
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  };
}

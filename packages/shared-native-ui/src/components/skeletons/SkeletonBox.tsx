import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '../../hooks';

interface SkeletonBoxProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  colorMode?: 'light' | 'dark';
  /** Accessibility label for screen readers. If not provided, skeleton is hidden from accessibility */
  accessibilityLabel?: string;
}

/**
 * Skeleton color constants - distinct from content to clearly indicate loading state
 * Light mode: Lighter grays (GRAY_200 base, GRAY_100 highlight)
 * Dark mode: Medium grays (GRAY_600 base, GRAY_500 highlight)
 */
const SKELETON_COLORS = {
  light: ['#E5E7EB', '#F3F4F6', '#E5E7EB'], // GRAY_200 -> GRAY_100 -> GRAY_200
  dark: ['#4B5563', '#6B7280', '#4B5563'], // GRAY_600 -> GRAY_500 -> GRAY_600
};

/**
 * Base skeleton box component for rectangular placeholders
 * Uses distinct colors and shimmer animation to clearly indicate loading state
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = 200,
  height = 20,
  borderRadius = 8,
  style,
  colorMode,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const mode = colorMode ?? (theme.mode === 'dark' ? 'dark' : 'light');

  return (
    <View
      style={style}
      accessibilityRole={accessibilityLabel ? 'none' : 'none'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <Skeleton
        colorMode={mode}
        colors={SKELETON_COLORS[mode]}
        radius={borderRadius}
        width={width}
        height={height}
      />
    </View>
  );
};


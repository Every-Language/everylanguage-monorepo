import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '../../hooks';

interface SkeletonTextProps {
  width?: number;
  height?: number;
  lines?: number;
  spacing?: number;
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
 * Skeleton text component for text placeholders
 * Supports multiple lines with spacing
 * Uses distinct colors and shimmer animation to clearly indicate loading state
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  width = 200,
  height = 16,
  lines = 1,
  spacing = 8,
  borderRadius = 4,
  style,
  colorMode,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const mode = colorMode ?? (theme.mode === 'dark' ? 'dark' : 'light');

  if (lines === 1) {
    return (
      <View
        style={style}
        accessibilityRole="none"
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
  }

  // Multiple lines - last line is typically shorter
  return (
    <View
      style={style}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLastLine = index === lines - 1;
        const lineWidth = isLastLine ? Math.floor(width * 0.75) : width;
        const marginBottom = isLastLine ? 0 : spacing;

        return (
          <View key={index} style={{ marginBottom }}>
            <Skeleton
              colorMode={mode}
              colors={SKELETON_COLORS[mode]}
              radius={borderRadius}
              width={lineWidth}
              height={height}
            />
          </View>
        );
      })}
    </View>
  );
};


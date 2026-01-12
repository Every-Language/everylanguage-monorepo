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
}

/**
 * Skeleton text component for text placeholders
 * Supports multiple lines with spacing
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  width = 200,
  height = 16,
  lines = 1,
  spacing = 8,
  borderRadius = 4,
  style,
  colorMode,
}) => {
  const { theme } = useTheme();
  const mode = colorMode ?? (theme.mode === 'dark' ? 'dark' : 'light');

  // Get skeleton colors based on theme
  const skeletonColors = {
    light: {
      primary: theme.colors.surfaceVariant || '#F3F4F6',
      secondary: theme.colors.background || '#FFFFFF',
    },
    dark: {
      primary: theme.colors.surfaceVariant || '#374151',
      secondary: theme.colors.surface || '#1F2937',
    },
  };

  const colors = skeletonColors[mode];

  if (lines === 1) {
    return (
      <View style={style}>
        <Skeleton
          colorMode={mode}
          colors={[colors.primary, colors.secondary]}
          radius={borderRadius}
          width={width}
          height={height}
        />
      </View>
    );
  }

  // Multiple lines - last line is typically shorter
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLastLine = index === lines - 1;
        const lineWidth = isLastLine ? Math.floor(width * 0.75) : width;
        const marginBottom = isLastLine ? 0 : spacing;

        return (
          <View key={index} style={{ marginBottom }}>
            <Skeleton
              colorMode={mode}
              colors={[colors.primary, colors.secondary]}
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


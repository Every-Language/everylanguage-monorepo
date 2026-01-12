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
}

/**
 * Base skeleton box component for rectangular placeholders
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = 200,
  height = 20,
  borderRadius = 8,
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
};


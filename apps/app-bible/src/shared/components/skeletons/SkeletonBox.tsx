import React from 'react';
import { Skeleton } from './Skeleton';
import type { ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * SkeletonBox component for rectangular placeholders
 * Alias for Skeleton with more semantic naming
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = React.memo(
  ({ width = '100%', height = 100, borderRadius = 8, style, testID }) => {
    return (
      <Skeleton
        width={width}
        height={height}
        borderRadius={borderRadius}
        style={style}
        testID={testID}
      />
    );
  }
);

SkeletonBox.displayName = 'SkeletonBox';

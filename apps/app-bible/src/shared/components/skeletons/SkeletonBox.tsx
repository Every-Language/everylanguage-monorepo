import React from 'react';
import { Skeleton } from './Skeleton';
import type { ViewStyle, DimensionValue } from 'react-native';

interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: DimensionValue;
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
    const props: React.ComponentProps<typeof Skeleton> = {
      width,
      height,
      borderRadius,
    };
    if (style !== undefined) props.style = style;
    if (testID !== undefined) props.testID = testID;
    return <Skeleton {...props} />;
  }
);

SkeletonBox.displayName = 'SkeletonBox';

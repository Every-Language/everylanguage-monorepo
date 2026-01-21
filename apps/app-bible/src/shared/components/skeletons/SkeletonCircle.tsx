import React from 'react';
import { Skeleton } from './Skeleton';
import type { ViewStyle } from 'react-native';

interface SkeletonCircleProps {
  size: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * SkeletonCircle component for circular placeholders (avatars, icons)
 */
export const SkeletonCircle: React.FC<SkeletonCircleProps> = React.memo(
  ({ size, style, testID }) => {
    return (
      <Skeleton
        width={size}
        height={size}
        borderRadius={size / 2}
        style={style}
        testID={testID}
      />
    );
  }
);

SkeletonCircle.displayName = 'SkeletonCircle';

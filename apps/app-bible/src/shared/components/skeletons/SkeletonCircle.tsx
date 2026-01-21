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
    const props: React.ComponentProps<typeof Skeleton> = {
      width: size,
      height: size,
      borderRadius: size / 2,
    };
    if (style !== undefined) props.style = style;
    if (testID !== undefined) props.testID = testID;
    return <Skeleton {...props} />;
  }
);

SkeletonCircle.displayName = 'SkeletonCircle';

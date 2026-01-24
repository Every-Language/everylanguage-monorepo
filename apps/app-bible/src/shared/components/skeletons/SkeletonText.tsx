import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { Skeleton } from './Skeleton';

interface SkeletonTextProps {
  width?: DimensionValue;
  height?: number;
  lines?: number;
  spacing?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * SkeletonText component for text line placeholders
 * Supports multiple lines with configurable spacing
 */
export const SkeletonText: React.FC<SkeletonTextProps> = React.memo(
  ({ width = '100%', height = 16, lines = 1, spacing = 8, style, testID }) => {
    const styles = StyleSheet.create({
      container: {
        gap: spacing,
      },
    });

    return (
      <View style={[styles.container, style]} testID={testID}>
        {Array.from({ length: lines }).map((_, index) => {
          const skeletonProps: React.ComponentProps<typeof Skeleton> = {
            width: index === lines - 1 ? '80%' : width,
            height,
            borderRadius: 4,
          };
          if (testID) skeletonProps.testID = `${testID}-line-${index}`;
          return <Skeleton key={index} {...skeletonProps} />;
        })}
      </View>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

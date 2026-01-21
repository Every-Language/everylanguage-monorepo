import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Skeleton } from './Skeleton';

interface SkeletonTextProps {
  width?: number | string;
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
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '80%' : width}
            height={height}
            borderRadius={4}
            testID={testID ? `${testID}-line-${index}` : undefined}
          />
        ))}
      </View>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

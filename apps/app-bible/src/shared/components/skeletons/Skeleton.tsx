import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/hooks';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Base Skeleton component with shimmer animation
 * Provides a shimmering placeholder effect for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = React.memo(
  ({ width = '100%', height = 20, borderRadius = 8, style, testID }) => {
    const { mode } = useTheme();
    const shimmerTranslateX = useSharedValue(-200);

    useEffect(() => {
      shimmerTranslateX.value = withRepeat(
        withTiming(400, { duration: 1500 }),
        -1,
        false
      );
    }, [shimmerTranslateX]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: shimmerTranslateX.value }],
      };
    });

    // Determine effective theme mode (handle 'system' mode)
    const effectiveMode = mode === 'system' ? 'light' : mode; // Default to light for system
    const isDark = effectiveMode === 'dark';

    // Theme-aware colors
    const baseColor = isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)';
    const highlightColor = isDark
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(0, 0, 0, 0.1)';

    const styles = StyleSheet.create({
      container: {
        width,
        height,
        borderRadius,
        backgroundColor: baseColor,
        overflow: 'hidden',
      },
      shimmer: {
        width: '200%',
        height: '100%',
        position: 'absolute',
      },
      gradient: {
        width: '100%',
        height: '100%',
      },
    });

    return (
      <View style={[styles.container, style]} testID={testID}>
        <Animated.View style={[styles.shimmer, animatedStyle]}>
          <LinearGradient
            colors={[baseColor, highlightColor, baseColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
      </View>
    );
  }
);

Skeleton.displayName = 'Skeleton';

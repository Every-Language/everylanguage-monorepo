import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/hooks';
import { AppTabs } from './AppTabs';
import { MediaPlayerSheet } from '@/features/media/components';
import { useCurrentTrack, useMediaPlayerExpanded } from '@/features/media';
import { StandaloneTabBar } from './StandaloneTabBar';

export const AppShell: React.FC = () => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();
  const isExpanded = useMediaPlayerExpanded();

  // Animate the tab bar selector off-screen when media player expands
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(
            isExpanded ? 200 : 0, // Move down enough to be off-screen
            {
              duration: 300,
              easing: Easing.out(Easing.cubic),
            }
          ),
        },
      ],
    };
  }, [isExpanded]);

  return (
    <View style={[styles.flex1, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex1}>
        <AppTabs />
      </SafeAreaView>
      {currentTrack ? <MediaPlayerSheet /> : null}
      {/* Render tab bar after bottom sheet to ensure it's on top */}
      <Animated.View style={tabBarAnimatedStyle}>
        <StandaloneTabBar />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});

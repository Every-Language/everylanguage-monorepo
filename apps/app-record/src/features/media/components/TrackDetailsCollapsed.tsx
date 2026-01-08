import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTrackSlideAnimation } from '@/features/media/hooks/useTrackSlideAnimation';
import { useTheme } from '@/shared/hooks';
import { useCurrentTrack } from '../store/PlaybackStore';

import type { ViewStyle } from 'react-native';

interface TrackDetailsCollapsedProps {
  style?: ViewStyle; // For animated styles passed from parent
  onPress?: () => void;
  enabled?: boolean;
}

export const TrackDetailsCollapsed: React.FC<TrackDetailsCollapsedProps> = ({
  style,
}) => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();
  const { entering, exiting } = useTrackSlideAnimation();

  if (!currentTrack) return null;

  const trackDetails = {
    title: currentTrack.title || 'Unknown Chapter',
    subtitle: currentTrack.subtitle,
    bookName: currentTrack.bookName || 'Unknown',
    chapterNumber: currentTrack.chapterNumber || 1,
  };

  return (
    <Animated.View
      key={currentTrack.id}
      entering={entering}
      exiting={exiting}
      style={[styles.collapsedTrackInfo, style]}>
      <View style={styles.collapsedContent}>
        <View style={styles.trackInfoLeft}>
          <Text
            style={[styles.collapsedTitle, { color: theme.colors.text }]}
            numberOfLines={1}>
            {trackDetails.title}
          </Text>
        </View>
        <Text
          style={[
            styles.collapsedLanguage,
            { color: theme.colors.textSecondary },
          ]}>
          {trackDetails.subtitle}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  collapsedTrackInfo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // height: 44,
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  trackInfoLeft: {
    flex: 1,
    marginRight: 12,
  },
  collapsedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  collapsedLanguage: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
});

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/shared/hooks';
import { useCurrentTrack } from '../../store/PlaybackStore';
import { getBookImageByNumber } from '@/features/bible/assets/bookArtRegistry';
import { useTrackSlideAnimation } from '@/features/media/hooks/useTrackSlideAnimation';

export const TrackDetailsExpanded: React.FC = React.memo(
  function TrackDetailsExpanded() {
    const { theme } = useTheme();
    const currentTrack = useCurrentTrack();

    // Get book number directly from current track
    const bookNumber = React.useMemo<number | null>(() => {
      if (!currentTrack?.bookGlobalOrder) return null;
      return Number.isFinite(currentTrack.bookGlobalOrder)
        ? currentTrack.bookGlobalOrder
        : null;
    }, [currentTrack?.bookGlobalOrder]);

    // Get animation hooks
    const { entering, exiting } = useTrackSlideAnimation();

    if (!currentTrack) return null;

    // Extract track details directly from currentTrack
    const trackDetails = {
      title: currentTrack.title || 'Unknown Chapter',
      subtitle: currentTrack.subtitle,
      bookName: currentTrack.title?.split(' ')[0] || 'Unknown',
      chapterNumber: parseInt(currentTrack.title?.split(' ')[1] || '1'),
    };

    const effectiveBookNumber = bookNumber || 1;

    return (
      <Animated.View
        key={currentTrack.id}
        entering={entering}
        exiting={exiting}
        style={styles.container}>
        {getBookImageByNumber(effectiveBookNumber) && (
          <Image
            source={getBookImageByNumber(effectiveBookNumber)}
            style={[styles.bookImage, { tintColor: theme.colors.primary }]}
          />
        )}
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={2}>
            {trackDetails.title}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={2}>
            {trackDetails.subtitle}
          </Text>
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  bookImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'left',
    marginTop: 4,
  },
});

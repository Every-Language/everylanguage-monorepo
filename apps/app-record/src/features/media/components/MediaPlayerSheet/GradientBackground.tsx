import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/hooks';
import {
  getMaterialOverlayColor,
  mixHexColors,
  deriveAlbumAccentHex,
} from '@/shared/utils/color';
import { useCurrentTrack } from '../../store/PlaybackStore';
import type { BottomSheetBackgroundProps } from '@gorhom/bottom-sheet';

export const GradientBackground: React.FC<BottomSheetBackgroundProps> = ({
  style,
}) => {
  const { theme } = useTheme();
  const currentTrack = useCurrentTrack();

  // Album art accent color logic (moved from useAlbumArtAccent hook)
  const albumAccent = useMemo(() => {
    if (!currentTrack) return theme.colors.secondary;
    const seed =
      (typeof currentTrack.artwork === 'string' && currentTrack.artwork) ||
      (typeof currentTrack.bookGlobalOrder === 'number'
        ? `book-${currentTrack.bookGlobalOrder}`
        : undefined) ||
      currentTrack.chapterId ||
      currentTrack.id;
    return deriveAlbumAccentHex(seed, theme.mode);
  }, [currentTrack, theme.mode, theme.colors.secondary]);

  // Add rounded corners to the background
  const containerStyle = useMemo(
    () => [
      style,
      {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden', // Ensure content respects the border radius
      },
    ],
    [style]
  );

  return (
    <Animated.View style={[containerStyle, styles.blurContainer]}>
      <LinearGradient
        colors={[
          mixHexColors(theme.colors.secondary, albumAccent, 0),
          mixHexColors(theme.colors.secondary, albumAccent, 0.2),
          mixHexColors(theme.colors.secondary, albumAccent, 0.6),
        ]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[StyleSheet.absoluteFillObject, styles.blurContainer]}
      />
      {/* Material overlay to stabilize contrast and keep brand consistency */}
      <View
        pointerEvents='none'
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: getMaterialOverlayColor(theme.mode),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  blurContainer: {},
});

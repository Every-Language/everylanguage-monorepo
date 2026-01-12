import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { SkeletonBox } from '@everylanguage/shared-native-ui';

/**
 * Skeleton component matching PlaylistCard structure
 * Shows image, title, description, and optional play button
 */
export const PlaylistCardSkeleton: React.FC = () => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface || theme.colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      flex: 1,
    },
    imageContainer: {
      height: 64,
      width: 64,
      borderRadius: 12,
      overflow: 'hidden',
    },
    textContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
      flex: 1,
    },
    playlistName: {
      marginBottom: 4,
    },
    playButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 4,
    },
  });

  return (
    <View style={styles.container}>
      {/* Image */}
      <SkeletonBox
        width={64}
        height={64}
        borderRadius={12}
        style={styles.imageContainer}
      />
      {/* Text content */}
      <View style={styles.textContent}>
        {/* Playlist name */}
        <SkeletonBox
          width={180}
          height={18}
          borderRadius={4}
          style={styles.playlistName}
        />
        {/* Description */}
        <SkeletonBox width={150} height={14} borderRadius={4} />
      </View>
      {/* Play button */}
      <SkeletonBox
        width={32}
        height={32}
        borderRadius={16}
        style={styles.playButton}
      />
    </View>
  );
};

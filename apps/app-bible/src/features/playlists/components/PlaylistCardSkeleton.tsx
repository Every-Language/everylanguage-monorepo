import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/**
 * PlaylistCardSkeleton component
 * Matches the structure of PlaylistCard for consistent loading states
 */
export const PlaylistCardSkeleton: React.FC = React.memo(() => {
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
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    textContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 4,
      flex: 1,
    },
    playButton: {
      paddingHorizontal: 4,
      width: 32,
      height: 32,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Skeleton width='100%' height='100%' borderRadius={12} />
      </View>
      <View style={styles.textContent}>
        <Skeleton width='70%' height={18} borderRadius={4} />
        <Skeleton width='50%' height={14} borderRadius={4} />
      </View>
      <View style={styles.playButton}>
        <SkeletonCircle size={32} />
      </View>
    </View>
  );
});

PlaylistCardSkeleton.displayName = 'PlaylistCardSkeleton';

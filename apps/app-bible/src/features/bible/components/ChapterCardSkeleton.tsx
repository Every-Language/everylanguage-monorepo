import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/**
 * ChapterCardSkeleton component
 * Matches the structure of ChapterCard for consistent loading states
 */
export const ChapterCardSkeleton: React.FC = React.memo(() => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    chapterCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
    },
    chapterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chapterMainContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chapterInfo: {
      flex: 1,
    },
    verseCountSkeleton: {
      marginTop: 4,
    },
    chapterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
  });

  return (
    <View style={styles.chapterCard}>
      <View style={styles.chapterContent}>
        <View style={styles.chapterMainContent}>
          <View style={styles.chapterInfo}>
            <Skeleton width='60%' height={20} borderRadius={4} />
            <View style={styles.verseCountSkeleton}>
              <Skeleton width='40%' height={16} borderRadius={4} />
            </View>
          </View>
          <View style={styles.chapterActions}>
            <SkeletonCircle size={40} />
            <Skeleton width={24} height={24} borderRadius={8} />
          </View>
        </View>
      </View>
    </View>
  );
});

ChapterCardSkeleton.displayName = 'ChapterCardSkeleton';

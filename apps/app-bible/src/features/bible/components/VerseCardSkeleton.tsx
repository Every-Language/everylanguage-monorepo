import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonText } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/**
 * VerseCardSkeleton component
 * Matches the structure of VerseCard for consistent loading states
 */
export const VerseCardSkeleton: React.FC = React.memo(() => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface || theme.colors.background,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 6,
    },
    verseContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    textContainer: {
      flex: 1,
      padding: 16,
    },
    menuContainer: {
      padding: 8,
      alignItems: 'center',
      justifyContent: 'flex-start',
      width: 40,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.verseContent}>
        <View style={styles.textContainer}>
          <SkeletonText width='100%' height={16} lines={2} spacing={8} />
        </View>
        <View style={styles.menuContainer}>
          <Skeleton width={20} height={20} borderRadius={4} />
        </View>
      </View>
    </View>
  );
});

VerseCardSkeleton.displayName = 'VerseCardSkeleton';

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/**
 * BookCardSkeleton component
 * Matches the structure of BookCard for consistent loading states
 */
export const BookCardSkeleton: React.FC = React.memo(() => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface || theme.colors.background,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      aspectRatio: 1.4,
      backgroundColor: theme.colors.surface,
      padding: 12,
    },
    imageInner: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    footer: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    bookNumber: {
      minWidth: 28,
      height: 28,
      borderRadius: 6,
    },
    bookName: {
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.image}>
        <View style={styles.imageInner}>
          <Skeleton width='80%' height='80%' borderRadius={8} />
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Skeleton
            width={28}
            height={28}
            borderRadius={6}
            style={styles.bookNumber}
          />
          <Skeleton
            width='70%'
            height={16}
            borderRadius={4}
            style={styles.bookName}
          />
        </View>
      </View>
    </View>
  );
});

BookCardSkeleton.displayName = 'BookCardSkeleton';

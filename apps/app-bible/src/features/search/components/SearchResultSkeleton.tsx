import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, SkeletonCircle } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/**
 * SearchResultSkeleton component
 * Matches the structure of SearchResultItem for consistent loading states
 */
export const SearchResultSkeleton: React.FC = React.memo(() => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginVertical: 2,
      borderRadius: 8,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    subtitleSkeleton: {
      marginTop: 4,
    },
  });

  return (
    <View style={styles.container}>
      <SkeletonCircle size={40} style={styles.iconContainer} />
      <View style={styles.content}>
        <Skeleton width='70%' height={16} borderRadius={4} />
        <View style={styles.subtitleSkeleton}>
          <Skeleton width='50%' height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  );
});

SearchResultSkeleton.displayName = 'SearchResultSkeleton';

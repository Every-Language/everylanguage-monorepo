import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { SkeletonBox, SkeletonCircle } from '@everylanguage/shared-native-ui';

/**
 * Skeleton component matching SearchResultItem structure
 * Shows icon, title, subtitle, and optional metadata
 */
export const SearchResultSkeleton: React.FC = () => {
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
    title: {
      marginBottom: 4,
    },
    subtitle: {
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>
      {/* Icon */}
      <SkeletonCircle size={40} style={styles.iconContainer} />
      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <SkeletonBox
          width={200}
          height={16}
          borderRadius={4}
          style={styles.title}
        />
        {/* Subtitle */}
        <SkeletonBox
          width={150}
          height={14}
          borderRadius={4}
          style={styles.subtitle}
        />
      </View>
    </View>
  );
};

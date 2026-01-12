import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { SkeletonBox, SkeletonText } from '@everylanguage/shared-native-ui';

/**
 * Skeleton component matching VerseCard structure
 * Shows verse number and text placeholder
 */
export const VerseCardSkeleton: React.FC = () => {
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
    verseNumberContainer: {
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.verseContent}>
        <View style={styles.textContainer}>
          {/* Verse number */}
          <View style={styles.verseNumberContainer}>
            <SkeletonBox width={40} height={16} borderRadius={4} />
          </View>
          {/* Verse text - 2-3 lines */}
          <SkeletonText
            width={280}
            height={16}
            lines={2}
            spacing={6}
            borderRadius={4}
          />
        </View>
      </View>
    </View>
  );
};

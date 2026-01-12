import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { SkeletonBox } from '@everylanguage/shared-native-ui';

/**
 * Skeleton component matching ChapterCard structure
 * Shows chapter title, verse count, and action buttons
 */
export const ChapterCardSkeleton: React.FC = () => {
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
    chapterTitle: {
      marginBottom: 8,
    },
    verseCount: {
      marginTop: 4,
    },
    chapterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 12,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
  });

  return (
    <View
      style={styles.chapterCard}
      accessibilityRole='none'
      accessibilityLabel='Loading chapter'
      importantForAccessibility='no-hide-descendants'>
      <View style={styles.chapterContent}>
        <View style={styles.chapterMainContent}>
          <View style={styles.chapterInfo}>
            {/* Chapter title */}
            <SkeletonBox
              width={120}
              height={20}
              borderRadius={4}
              style={styles.chapterTitle}
            />
            {/* Verse count */}
            <SkeletonBox
              width={80}
              height={14}
              borderRadius={4}
              style={styles.verseCount}
            />
          </View>
          {/* Action buttons */}
          <View style={styles.chapterActions}>
            <SkeletonBox
              width={40}
              height={40}
              borderRadius={20}
              style={styles.actionButton}
            />
            <SkeletonBox
              width={40}
              height={40}
              borderRadius={20}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

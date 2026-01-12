import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { SkeletonBox } from '@everylanguage/shared-native-ui';
import { useResponsiveGrid, BOOK_GRID_CONFIG } from '@/shared/utils/responsive';

/**
 * Skeleton component matching BookCard structure
 * Shows image area (aspect ratio 1.4) and footer with book number and name
 */
export const BookCardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const { numColumns } = useResponsiveGrid(BOOK_GRID_CONFIG);

  // Calculate card width based on grid
  const screenWidth = Dimensions.get('window').width;
  const containerPadding = BOOK_GRID_CONFIG.containerPadding;
  const gap = BOOK_GRID_CONFIG.gap;
  const availableWidth = screenWidth - containerPadding;
  const cardWidth =
    (availableWidth - gap * (numColumns - 1)) / numColumns - gap;

  // Image height based on aspect ratio 1.4
  const imageHeight = cardWidth / 1.4;

  const styles = StyleSheet.create({
    container: {
      borderRadius: 12,
      backgroundColor: theme.colors.surface || theme.colors.background,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: imageHeight,
      backgroundColor: theme.colors.surface,
      padding: 12,
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
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    bookName: {
      flex: 1,
      height: 16,
      borderRadius: 4,
    },
  });

  return (
    <View
      style={styles.container}
      accessibilityRole='none'
      accessibilityLabel='Loading book'
      importantForAccessibility='no-hide-descendants'>
      {/* Image area */}
      <View style={styles.image}>
        <SkeletonBox
          width={cardWidth - 24}
          height={imageHeight - 24}
          borderRadius={8}
        />
      </View>
      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {/* Book number badge */}
          <SkeletonBox
            width={28}
            height={28}
            borderRadius={6}
            style={styles.bookNumber}
          />
          {/* Book name */}
          <SkeletonBox
            width={cardWidth - 60}
            height={16}
            borderRadius={4}
            style={styles.bookName}
          />
        </View>
      </View>
    </View>
  );
};

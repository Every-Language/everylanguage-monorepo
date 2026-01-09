import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { BookWithMetadata } from '@/features/bible/types';

interface BookItemProps {
  book: BookWithMetadata;
  onPress: () => void;
  chaptersCount?: number;
}

export const BookItem: React.FC<BookItemProps> = ({
  book,
  onPress,
  chaptersCount,
}) => {
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
    content: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    chaptersCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={styles.title}>{book.name}</Text>
        <Text style={styles.subtitle}>
          {book.testament === 'old' ? 'Old Testament' : 'New Testament'}
          {chaptersCount && (
            <Text style={styles.chaptersCount}>• {chaptersCount} chapters</Text>
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

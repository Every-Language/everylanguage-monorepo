import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { ChapterWithMetadata } from '@/features/bible/types';

interface ChapterItemProps {
  chapter: ChapterWithMetadata;
  onPress: () => void;
  bookName: string;
}

export const ChapterItem: React.FC<ChapterItemProps> = ({
  chapter,
  onPress,
  bookName,
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
    verseCount: {
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
        <Text style={styles.title}>
          {bookName} {chapter.chapter_number}
        </Text>
        <Text style={styles.subtitle}>
          {chapter.verseRange}
          {chapter.total_verses > 0 && (
            <Text style={styles.verseCount}>
              • {chapter.total_verses} verses
            </Text>
          )}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

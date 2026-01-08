import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/hooks';
import type { Verse } from '@/features/bible/types';

interface VerseItemProps {
  verse: Verse;
  onPress: () => void;
  bookName: string;
  chapterNumber: number;
}

export const VerseItem: React.FC<VerseItemProps> = ({
  verse,
  onPress,
  bookName,
  chapterNumber,
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
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {bookName} {chapterNumber}:{verse.verse_number}
        </Text>
        <Text style={styles.subtitle}>Verse {verse.verse_number}</Text>
      </View>
    </TouchableOpacity>
  );
};

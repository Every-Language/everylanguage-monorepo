import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, useTranslation } from '@/shared/hooks';
import type { Chapter, Sequence } from '@/shared/types/sequence';

export interface ChapterListItemProps {
  chapter: Chapter;
  sequence: Sequence | null;
  isLast: boolean;
  onPress?: (sequenceId: string) => void;
}

/**
 * Memoized Chapter List Item Component
 *
 * Optimized list item for chapter/sequence rendering.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const ChapterListItem = React.memo<ChapterListItemProps>(
  ({ chapter, sequence, isLast, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const hasSequence = !!sequence;

    const handlePress = (): void => {
      if (hasSequence && sequence && onPress) {
        onPress(sequence.id);
      }
    };

    return (
      <TouchableOpacity
        style={[
          isLast ? styles.chapterItemLast : styles.chapterItem,
          { borderBottomColor: theme.colors.border },
          !hasSequence && styles.chapterItemEmpty,
        ]}
        onPress={hasSequence ? handlePress : undefined}
        disabled={!hasSequence}
        accessibilityLabel={
          hasSequence
            ? `Open sequence ${sequence.name}`
            : `Chapter ${chapter.chapter_number} (no sequence)`
        }>
        <View style={styles.chapterItemContent}>
          <Text
            style={[
              styles.chapterItemName,
              {
                color: hasSequence
                  ? theme.colors.text
                  : theme.colors.textSecondary,
              },
            ]}
            numberOfLines={1}>
            {hasSequence
              ? sequence.name
              : t('sequences.create.chapterNumber', {
                  number: chapter.chapter_number,
                })}
          </Text>
          {hasSequence && sequence.description && (
            <Text
              style={[
                styles.chapterItemDescription,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={2}>
              {sequence.description}
            </Text>
          )}
        </View>
        {hasSequence && (
          <Text
            style={[
              styles.chapterItemChevron,
              { color: theme.colors.textSecondary },
            ]}>
            ›
          </Text>
        )}
      </TouchableOpacity>
    );
  },
  // Custom comparison function for better performance
  (prevProps, nextProps) => {
    return (
      prevProps.chapter.id === nextProps.chapter.id &&
      prevProps.chapter.chapter_number === nextProps.chapter.chapter_number &&
      prevProps.sequence?.id === nextProps.sequence?.id &&
      prevProps.sequence?.name === nextProps.sequence?.name &&
      prevProps.sequence?.description === nextProps.sequence?.description &&
      prevProps.isLast === nextProps.isLast
    );
  }
);

ChapterListItem.displayName = 'ChapterListItem';

const styles = StyleSheet.create({
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingLeft: 44, // Indent chapters under book header
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chapterItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingLeft: 44,
    borderBottomWidth: 0,
  },
  chapterItemEmpty: {
    opacity: 0.5,
  },
  chapterItemContent: {
    flex: 1,
    marginRight: 16,
  },
  chapterItemName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 4,
  },
  chapterItemDescription: {
    fontSize: 15,
  },
  chapterItemChevron: {
    fontSize: 24,
  },
});

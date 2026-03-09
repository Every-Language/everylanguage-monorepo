import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/hooks';
import { ChapterListItem } from './chapter-list-item';
import type { Book, Chapter, Sequence } from '@/shared/types/sequence';

export interface BookSectionProps {
  book: Book;
  chapters: Chapter[];
  sequences: Sequence[];
  sequenceByChapterId: Map<string, Sequence>;
  isCollapsed: boolean;
  onToggleCollapse: (bookId: string) => void;
  onSequencePress?: (sequenceId: string) => void;
}

/**
 * Memoized Book Section Component
 *
 * Displays a book with its chapters and sequences.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const BookSection = React.memo<BookSectionProps>(
  ({
    book,
    chapters,
    sequences,
    sequenceByChapterId,
    isCollapsed,
    onToggleCollapse,
    onSequencePress,
  }) => {
    const { theme } = useTheme();

    const handleToggle = (): void => {
      onToggleCollapse(book.id);
    };

    return (
      <View
        style={[styles.bookSection, { backgroundColor: theme.colors.surface }]}>
        {/* Book Header */}
        <TouchableOpacity
          style={styles.bookHeader}
          onPress={handleToggle}
          activeOpacity={0.7}>
          <View style={styles.bookHeaderContent}>
            <Ionicons
              name={isCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={theme.colors.textSecondary}
              style={styles.bookHeaderIcon}
            />
            <Text style={[styles.bookHeaderText, { color: theme.colors.text }]}>
              {book.name}
            </Text>
          </View>
          <Text
            style={[
              styles.bookHeaderCount,
              { color: theme.colors.textSecondary },
            ]}>
            {sequences.length}/{chapters.length}
          </Text>
        </TouchableOpacity>

        {/* Chapters List */}
        {!isCollapsed && (
          <View>
            {chapters.map((chapter, chapterIndex) => {
              const sequence = sequenceByChapterId.get(chapter.id);
              const isLastChapter = chapterIndex === chapters.length - 1;

              return (
                <ChapterListItem
                  key={chapter.id}
                  chapter={chapter}
                  sequence={sequence || null}
                  isLast={isLastChapter}
                  {...(onSequencePress && { onPress: onSequencePress })}
                />
              );
            })}
          </View>
        )}
      </View>
    );
  },
  // Custom comparison function for better performance
  (prevProps, nextProps) => {
    return (
      prevProps.book.id === nextProps.book.id &&
      prevProps.isCollapsed === nextProps.isCollapsed &&
      prevProps.chapters.length === nextProps.chapters.length &&
      prevProps.sequences.length === nextProps.sequences.length &&
      prevProps.onToggleCollapse === nextProps.onToggleCollapse &&
      prevProps.onSequencePress === nextProps.onSequencePress
    );
  }
);

BookSection.displayName = 'BookSection';

const styles = StyleSheet.create({
  bookSection: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  bookHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookHeaderIcon: {
    marginRight: 12,
  },
  bookHeaderText: {
    fontSize: 17,
    fontWeight: '600',
  },
  bookHeaderCount: {
    fontSize: 15,
    fontWeight: '500',
  },
});

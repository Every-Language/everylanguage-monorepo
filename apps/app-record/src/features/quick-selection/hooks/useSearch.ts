import { useMemo } from 'react';
import type {
  BookWithMetadata,
  ChapterWithMetadata,
  Verse,
} from '@/features/bible/types';

/**
 * Hook for book search functionality
 */
export const useBookSearch = (
  books: BookWithMetadata[],
  searchQuery: string
) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return books;

    return books.filter(book =>
      book.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [books, searchQuery]);
};

/**
 * Hook for chapter search functionality
 */
export const useChapterSearch = (
  chapters: ChapterWithMetadata[],
  searchQuery: string
) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return chapters;

    const chapterNum = parseInt(searchQuery);
    if (isNaN(chapterNum)) return chapters;

    return chapters.filter(chapter => chapter.chapter_number === chapterNum);
  }, [chapters, searchQuery]);
};

/**
 * Hook for verse search functionality
 */
export const useVerseSearch = (verses: Verse[], searchQuery: string) => {
  return useMemo(() => {
    if (!searchQuery.trim()) return verses;

    const verseNum = parseInt(searchQuery);
    if (isNaN(verseNum)) return verses;

    return verses.filter(verse => verse.verse_number === verseNum);
  }, [verses, searchQuery]);
};

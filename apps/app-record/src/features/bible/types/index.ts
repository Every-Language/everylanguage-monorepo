import type { Tables } from '@everylanguage/shared-types';

// Minimal availability enum for UI purposes
export type MediaAvailabilityStatus = 'none' | 'partial' | 'complete';

// Use the existing books table type from shared types
export type Book = Tables<'books'>;
export type Chapter = Tables<'chapters'>;
export type Verse = Tables<'verses'>;

// Simplified verse text interface for Bible feature
export interface VerseText {
  id: string;
  verse_id: string;
  text_version_id: string;
  verse_text: string;
  publish_status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// Extended book type with additional metadata
export interface BookWithMetadata extends Book {
  chaptersCount?: number;
}

// Extended chapter type with additional metadata
export interface ChapterWithMetadata extends Chapter {
  title: string;
  verseRange: string;
  mediaAvailability: MediaAvailabilityStatus;
  versesMarked: boolean; // Whether all verses in the chapter have corresponding media file verses
  // Availability enrichment
  mediaFileCount: number;
  downloadedFileCount: number;
  isAvailable: boolean; // Whether chapter has text content (verses) available
  isDownloaded: boolean;
  hasMediaFiles: boolean; // Whether chapter has audio files available
  // Download progress aggregation
  totalDownloadedBytes?: number;
  totalFileSizeBytes?: number;
  downloadProgressRatio?: number; // 0..1
}

// ✅ NEW: Interface for verse with associated text
export interface VerseWithText {
  verse: Verse;
  verseText: VerseText | null;
}

export interface BooksFilters {
  testament?: 'OT' | 'NT';
  search?: string;
  searchQuery?: string;
  sortBy?: 'name' | 'book_number' | 'global_order';
  sortOrder?: 'asc' | 'desc';
}

export interface BooksState {
  books: Book[];
  filteredBooks: Book[];
  loading: boolean;
  error: string | null;
  filters: BooksFilters;
  selectedBook: Book | null;
}

export interface ChaptersState {
  chapters: Chapter[];
  loading: boolean;
  error: string | null;
  selectedChapter: Chapter | null;
}

export interface VersesState {
  verses: Verse[];
  loading: boolean;
  error: string | null;
  selectedVerse: Verse | null;
}

// ✅ NEW: Enhanced verses state with text support
export interface VersesWithTextState {
  versesWithTexts: VerseWithText[];
  loading: boolean;
  error: string | null;
  selectedVerse: Verse | null;
  currentTextVersion: unknown; // Will be properly typed when we use it
}

export interface BibleNavigationState {
  currentScreen: 'books' | 'chapters';
  selectedBook: Book | null;
  selectedChapter: Chapter | null;
  selectedVerse: Verse | null;
}

export type BookSortBy = 'name' | 'book_number' | 'global_order';

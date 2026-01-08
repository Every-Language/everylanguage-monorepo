export interface SearchResult {
  id: string;
  type: 'book' | 'chapter' | 'verse';
  title: string;
  subtitle?: string;
  metadata?: string;
  bookId?: string;
  chapterId?: string;
  verseId?: string;
  relevanceScore?: number;
}

export interface SearchFilters {
  type: 'all' | 'books' | 'chapters' | 'verses';
  testament?: 'OT' | 'NT';
  textVersion?: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  loading: boolean;
  error: string | null;
  recentSearches: string[];
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}

export interface BookSearchResult {
  type: 'book';
  id: string;
  name: string;
  title: string;
  book_number: number;
  testament: 'OT' | 'NT';
  chapter_count: number;
  global_order?: number; // Optional, will fallback to book_number
}

export interface ChapterSearchResult {
  type: 'chapter';
  id: string;
  title: string;
  chapter_number: number;
  book_id: string;
  book_name: string;
  book_number?: number;
  testament?: 'OT' | 'NT';
  total_verses?: number;
  global_order?: number;
}

export interface VerseSearchResult {
  type: 'verse';
  id: string;
  title: string;
  verse_number: number;
  chapter_id: string;
  chapter_number: number;
  book_id: string;
  book_name: string;
  book_number?: number;
  testament?: 'OT' | 'NT';
  verse_text: string;
  text_snippet: string;
  total_verses?: number;
}

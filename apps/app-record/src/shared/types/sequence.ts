/**
 * Shared Sequence type definition
 *
 * Represents a sequence from the PowerSync local database.
 * Moved to shared/types to allow cross-feature usage without violating
 * unidirectional import rules.
 */
export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  book_id: string;
  chapter_id: string | null;
  is_bible_audio: number; // 0 or 1 in SQLite
  start_verse_id: string | null;
  end_verse_id: string | null;
  project_id: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  upload_status: string;
  publish_status: string;
  check_status: string;
}

/**
 * Book type definition
 */
export interface Book {
  id: string;
  name: string;
  book_number: number;
  bible_version_id: string;
  global_order: number;
  testament: string;
}

/**
 * Chapter type definition
 */
export interface Chapter {
  id: string;
  chapter_number: number;
  book_id: string;
  total_verses: number;
  global_order: number;
}

/**
 * Verse type definition
 */
export interface Verse {
  id: string;
  chapter_id: string;
  verse_number: number;
  global_order: number;
}

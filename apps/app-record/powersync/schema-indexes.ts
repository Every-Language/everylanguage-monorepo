/**
 * Declarative index definitions per table.
 * Keys are table names, values are arrays of index definitions.
 * Each index is an ordered list of column names.
 */
export type IndexDefinition = string[];
export type TableIndexes = Record<string, IndexDefinition[]>;

// Suggested indexes based on current features (languages, bible, media usage)
export const tableIndexes: TableIndexes = {
  // Bible browsing performance
  books: [['global_order'], ['testament'], ['bible_version_id']],
  chapters: [['book_id'], ['global_order'], ['chapter_number']],
  verses: [['chapter_id'], ['global_order'], ['verse_number']],
  verse_texts: [
    ['text_version_id'],
    ['verse_id'],
    ['verse_id', 'text_version_id'], // ✅ CRITICAL for optimized verse data JOIN
  ],

  // Media usage - OPTIMIZED for queue building and chapter metadata
  media_files: [
    ['audio_version_id'],
    ['chapter_id'],
    ['language_entity_id'],
    ['chapter_id', 'audio_version_id'], // ✅ CRITICAL for queue building
    ['audio_version_id', 'chapter_id'], // ✅ Reverse index for media resolution
    ['chapter_id', 'deleted_at'], // ✅ CRITICAL for verse data JOIN performance
    ['id', 'chapter_id'], // ✅ For media_files_verses -> media_files JOIN
    ['audio_version_id', 'deleted_at'], // ✅ NEW: For chapter metadata queries
    ['chapter_id', 'audio_version_id', 'deleted_at'], // ✅ NEW: Optimized for metadata aggregation
  ],
  media_files_verses: [
    ['media_file_id'],
    ['verse_id'],
    ['denormalized_audio_version_id'],
    ['media_file_id', 'verse_id'], // ✅ For verse seeking
    ['verse_id', 'denormalized_audio_version_id'], // ✅ For verse timing lookups
  ],

  // User selections and saved versions
  user_current_selections: [['user_id']],
  user_saved_text_versions: [['user_id'], ['text_version_id']],
  user_saved_audio_versions: [['user_id'], ['audio_version_id']],

  // Images
  images: [['set_id'], ['target_id'], ['target_type']],

  // Local-only tables
  media_files_downloads: [
    ['media_file_id'],
    ['download_status'],
    ['download_status', 'media_file_id'],
    ['priority', 'download_status'],
    ['media_file_id', 'download_status'], // ✅ NEW: For chapter metadata aggregation
  ],
  download_queue: [
    ['status', 'priority', 'enqueued_at'],
    ['media_file_id', 'status'],
    ['started_at'],
  ],
};

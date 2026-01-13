/**
 * Declarative index definitions per table.
 * Keys are table names, values are arrays of index definitions.
 * Each index is an ordered list of column names.
 */
export type IndexDefinition = string[];
export type TableIndexes = Record<string, IndexDefinition[]>;

// Indexes based on sync rules and common query patterns for app-record
export const tableIndexes: TableIndexes = {
  // Bible browsing performance (global content)
  books: [['global_order'], ['testament'], ['bible_version_id']],
  chapters: [['book_id'], ['global_order'], ['chapter_number']],
  verses: [['chapter_id'], ['global_order'], ['verse_number']],

  // Project data - optimized for user project queries
  projects: [
    ['created_by'],
    ['project_status'],
    ['deleted_at'],
    ['created_by', 'deleted_at'], // ✅ For user's active projects
    ['project_status', 'deleted_at'], // ✅ For filtering by status
  ],

  // Sequences - optimized for project and chapter lookups
  sequences: [
    ['project_id'],
    ['book_id'],
    ['chapter_id'],
    ['project_id', 'deleted_at'], // ✅ For active sequences in a project
    ['chapter_id', 'deleted_at'], // ✅ For sequences in a chapter
    ['project_id', 'chapter_id'], // ✅ For project chapter sequences
    ['project_id', 'is_bible_audio'], // ✅ For filtering bible audio sequences
  ],

  // Segments - optimized for sequence and project queries
  segments: [
    ['project_id'],
    ['sequence_id'],
    ['project_id', 'deleted_at'], // ✅ For active segments in a project
    ['sequence_id', 'deleted_at'], // ✅ For active segments in a sequence
    ['sequence_id', 'segment_index'], // ✅ For ordered segment queries
    ['project_id', 'sequence_id'], // ✅ For project sequence segments
  ],

  // Audio versions - optimized for project lookups
  audio_versions: [
    ['project_id'],
    ['language_entity_id'],
    ['project_id', 'deleted_at'], // ✅ For active audio versions in a project
    ['language_entity_id', 'project_id'], // ✅ For language-specific versions
    ['project_id', 'publish_status'], // ✅ For filtering by publish status
  ],

  // Media files - OPTIMIZED for queue building and chapter metadata
  media_files: [
    ['audio_version_id'],
    ['chapter_id'],
    ['language_entity_id'],
    ['project_id'],
    ['chapter_id', 'audio_version_id'], // ✅ CRITICAL for queue building
    ['audio_version_id', 'chapter_id'], // ✅ Reverse index for media resolution
    ['chapter_id', 'deleted_at'], // ✅ CRITICAL for verse data JOIN performance
    ['id', 'chapter_id'], // ✅ For media_files_verses -> media_files JOIN
    ['audio_version_id', 'deleted_at'], // ✅ For chapter metadata queries
    ['chapter_id', 'audio_version_id', 'deleted_at'], // ✅ Optimized for metadata aggregation
    ['project_id', 'deleted_at'], // ✅ For project media files
    ['project_id', 'audio_version_id'], // ✅ For project audio version media
  ],

  // Media files verses - optimized for verse timing and seeking
  media_files_verses: [
    ['media_file_id'],
    ['verse_id'],
    ['denormalized_audio_version_id'],
    ['project_id'],
    ['media_file_id', 'verse_id'], // ✅ For verse seeking
    ['verse_id', 'denormalized_audio_version_id'], // ✅ For verse timing lookups
    ['project_id', 'verse_id'], // ✅ For project verse lookups
  ],

  // Local-only tables - optimized for download management
  media_files_downloads: [
    ['media_file_id'],
    ['download_status'],
    ['download_status', 'media_file_id'],
    ['priority', 'download_status'],
    ['media_file_id', 'download_status'], // ✅ For chapter metadata aggregation
  ],
  download_queue: [
    ['status', 'priority', 'enqueued_at'],
    ['media_file_id', 'status'],
    ['started_at'],
  ],
};

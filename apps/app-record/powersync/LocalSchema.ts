import { column, Schema, Table } from '@powersync/react-native';

/**
 * Local-only tables that are not synced to the server
 * These tables store device-specific data like download states and local file paths
 */

// Local-only table for media file downloads
const media_files_downloads = new Table(
  {
    media_file_id: column.text, // FK to media_files.id
    local_file_path: column.text, // Local file system path (file://...)
    download_status: column.text, // 'queued','downloading','paused','completed','failed'
    progress: column.real, // 0.0 - 1.0 progress
    downloaded_bytes: column.integer, // Bytes written so far
    file_size_bytes: column.integer, // Expected file size for progress tracking
    error_message: column.text, // Last error if failed
    priority: column.integer, // Higher means sooner
    retry_count: column.integer, // Number of retries attempted
    last_attempt_at: column.text, // ISO timestamp of last attempt
    downloaded_at: column.text, // ISO timestamp when download completed
    created_at: column.text, // ISO timestamp when record created
    updated_at: column.text, // ISO timestamp when record last updated
  },
  {
    localOnly: true, // Prevent syncing to server
    indexes: {
      media_file: ['media_file_id'],
      status: ['download_status'],
      status_media: ['download_status', 'media_file_id'],
      priority_status: ['priority', 'download_status'],
    },
  }
);

// Local-only table for download queue entries (separate from status for robustness)
const download_queue = new Table(
  {
    id: column.text, // UUID for queue item
    media_file_id: column.text, // FK to media_files.id
    file_size_bytes: column.integer,
    priority: column.integer, // Base priority
    enqueued_at: column.text, // ISO timestamp
    started_at: column.text, // ISO timestamp
    completed_at: column.text, // ISO timestamp
    status: column.text, // 'queued','active','completed','failed','paused'
    error_message: column.text, // Error if failed
    signed_url: column.text, // Cached presigned URL for streaming/downloading
    signed_url_expires_at: column.text, // ISO timestamp when signed_url expires
  },
  {
    localOnly: true,
    indexes: {
      status_priority: ['status', 'priority'],
      media_file_status: ['media_file_id', 'status'],
    },
  }
);

// Local-only table: which audio versions should auto-download
const user_saved_audio_versions_downloads = new Table(
  {
    audio_version_id: column.text, // FK to audio_versions.id
    created_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      version: ['audio_version_id'],
    },
  }
);

// Local-only table: language labels cache per version
const version_language_lookup = new Table(
  {
    id: column.text, // UUID for lookup entry
    version_type: column.text, // 'audio' | 'text'
    version_id: column.text, // audio_versions.id or text_versions.id
    language_entity_id: column.text,
    language_entity_name: column.text,
    language_alias_name: column.text,
    region_name: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    localOnly: true,
    indexes: {
      version: ['version_type', 'version_id'],
      language_entity: ['language_entity_id'],
    },
  }
);

// Local-only table: enhanced user queue for RNTP integration
const user_queue = new Table(
  {
    id: column.text, // UUID
    track_id: column.text, // Unique track identifier (chapter_id + audio_version_id)
    chapter_id: column.text, // FK to chapters.id
    audio_version_id: column.text, // FK to audio_versions.id
    order_index: column.integer, // Position in queue (0-based)
    added_at: column.text, // ISO timestamp
    added_from_context: column.text, // 'chapter_list' | 'verse_screen' | 'history' | 'search' | 'add_to_queue'
    is_protected: column.integer, // 1 for protected, 0 for non-protected
  },
  {
    localOnly: true,
    indexes: {
      order_idx: ['order_index'],
      chapter_version: ['chapter_id', 'audio_version_id'],
      protected_status: ['is_protected', 'order_index'],
      by_track: ['track_id'],
    },
  }
);

// Local-only table: enhanced play history
const play_history = new Table(
  {
    id: column.text, // UUID
    track_id: column.text, // chapter_id + audio_version_id
    chapter_id: column.text, // FK to chapters.id
    audio_version_id: column.text, // FK to audio_versions.id
    language_entity_id: column.text, // For history filtering
    started_at: column.text, // ISO timestamp
    completed_at: column.text, // ISO timestamp (null if not finished)
    last_position_seconds: column.real, // Position when stopped/paused
    duration_seconds: column.real, // Total track duration
    completion_percentage: column.real, // 0.0 - 1.0
  },
  {
    localOnly: true,
    indexes: {
      started_idx: ['started_at'],
      by_track: ['track_id'],
      by_chapter: ['chapter_id'],
      by_version: ['audio_version_id'],
      by_language: ['language_entity_id'],
    },
  }
);

// Local-only table: queue state persistence
const queue_state = new Table(
  {
    id: column.text, // Always 'current' (singleton)
    protected_count: column.integer, // Number of protected tracks at top
    last_updated: column.text, // ISO timestamp
    current_track_index: column.integer, // Index in RNTP queue
    current_position_seconds: column.real, // Last known position
    history_retention_limit: column.integer, // Configurable history limit (default 100)
  },
  {
    localOnly: true,
    indexes: {
      singleton: ['id'], // Only one record with id='current'
    },
  }
);

// Local-only table: autoplay queue (ephemeral, resets when user plays new track)
const autoplay_queue = new Table(
  {
    id: column.text, // UUID
    track_id: column.text, // chapter_id + audio_version_id
    chapter_id: column.text, // FK to chapters.id
    audio_version_id: column.text, // FK to audio_versions.id
    order_index: column.integer, // Ordering within autoplay queue
    source_context: column.text, // 'book_sequence' | 'playlist' | 'artist' | 'album'
    source_id: column.text, // book_id | playlist_id | etc
    generated_at: column.text, // ISO timestamp when this queue was generated
  },
  {
    localOnly: true,
    indexes: {
      order_context: ['order_index', 'source_context'],
      by_chapter: ['chapter_id'],
      by_source: ['source_context', 'source_id'],
      by_track: ['track_id'],
    },
  }
);

// Local-only table for image downloads (status)
const images_downloads = new Table(
  {
    image_id: column.text, // FK to images.id
    set_id: column.text, // FK to image_sets.id (denormalized for grouping)
    local_file_path: column.text, // Local file system path (file://...)
    download_status: column.text, // 'queued','downloading','paused','completed','failed'
    progress: column.real, // 0.0 - 1.0 progress
    downloaded_bytes: column.integer, // Bytes written so far
    file_size_bytes: column.integer, // Expected file size for progress tracking (if known)
    error_message: column.text, // Last error if failed
    priority: column.integer, // Higher means sooner
    retry_count: column.integer, // Number of retries attempted
    last_attempt_at: column.text, // ISO timestamp of last attempt
    downloaded_at: column.text, // ISO timestamp when download completed
    created_at: column.text, // ISO timestamp when record created
    updated_at: column.text, // ISO timestamp when record last updated
  },
  {
    localOnly: true,
    indexes: {
      by_image: ['image_id'],
      by_status: ['download_status'],
      status_image: ['download_status', 'image_id'],
      priority_status: ['priority', 'download_status'],
      by_set: ['set_id'],
    },
  }
);

// Local-only table for image download queue entries
const images_download_queue = new Table(
  {
    id: column.text, // UUID for queue item
    image_id: column.text, // FK to images.id
    set_id: column.text, // For folder placement and batching
    file_size_bytes: column.integer,
    priority: column.integer, // Base priority
    enqueued_at: column.text, // ISO timestamp
    started_at: column.text, // ISO timestamp
    completed_at: column.text, // ISO timestamp
    status: column.text, // 'queued','active','completed','failed','paused'
    error_message: column.text, // Error if failed
    signed_url: column.text, // Cached presigned URL for download
    signed_url_expires_at: column.text, // ISO timestamp when signed_url expires
  },
  {
    localOnly: true,
    indexes: {
      status_priority: ['status', 'priority'],
      image_status: ['image_id', 'status'],
      by_set: ['set_id'],
    },
  }
);

// Local-only table: pre-computed chapter metadata for performance optimization
const chapter_metadata = new Table(
  {
    chapter_id: column.text, // FK to chapters.id
    audio_version_id: column.text, // FK to audio_versions.id
    book_id: column.text, // FK to books.id (denormalized for fast lookups)
    chapter_number: column.integer, // Denormalized chapter number
    book_name: column.text, // Denormalized book name
    title: column.text, // Computed title (book_name + chapter_number)
    verse_count: column.integer, // Count of verses in chapter
    verse_range: column.text, // Computed verse range (e.g., "1-31")
    media_file_count: column.integer, // Count of media files for this chapter/version
    downloaded_file_count: column.integer, // Count of downloaded media files
    total_downloaded_bytes: column.integer, // Total bytes downloaded
    total_file_size_bytes: column.integer, // Total file size for all media files
    download_progress_ratio: column.real, // 0.0 - 1.0 progress ratio
    last_updated_at: column.text, // ISO timestamp when metadata was last computed
  },
  {
    localOnly: true, // Never sync to server - computed locally
    indexes: {
      primary_lookup: ['chapter_id', 'audio_version_id'], // Primary lookup key
      book_lookup: ['book_id', 'audio_version_id'], // Fast book chapters lookup
      version_cleanup: ['audio_version_id'], // For cleanup when version changes
      update_time: ['last_updated_at'], // For stale data cleanup
    },
  }
);

export const LocalSchema = new Schema({
  media_files_downloads,
  download_queue,
  user_saved_audio_versions_downloads,
  version_language_lookup,
  user_queue,
  autoplay_queue,
  play_history,
  queue_state,
  // Images download pipeline (local-only)
  images_downloads,
  images_download_queue,
  // Performance optimization tables
  chapter_metadata,
});

// Export a map of local tables for schema combination scripts
export const localTables = {
  media_files_downloads,
  download_queue,
  user_saved_audio_versions_downloads,
  version_language_lookup,
  user_queue,
  autoplay_queue,
  play_history,
  queue_state,
  images_downloads,
  images_download_queue,
  chapter_metadata,
};

// Export types for TypeScript
export type LocalDatabase = (typeof LocalSchema)['types'];
export type MediaFileDownloadRecord = LocalDatabase['media_files_downloads'];
export type DownloadQueueRecord = LocalDatabase['download_queue'];
export type UserQueueRecord = LocalDatabase['user_queue'];
export type AutoplayQueueRecord = LocalDatabase['autoplay_queue'];
export type PlayHistoryRecord = LocalDatabase['play_history'];
export type QueueStateRecord = LocalDatabase['queue_state'];
export type ImageDownloadRecord = LocalDatabase['images_downloads'];
export type ImageDownloadQueueRecord = LocalDatabase['images_download_queue'];
export type ChapterMetadataRecord = LocalDatabase['chapter_metadata'];

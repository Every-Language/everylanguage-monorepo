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

export const LocalSchema = new Schema({
  media_files_downloads,
  download_queue,
});

// Export a map of local tables for schema combination scripts
export const localTables = {
  media_files_downloads,
  download_queue,
};

// Export types for TypeScript
export type LocalDatabase = (typeof LocalSchema)['types'];
export type MediaFileDownloadRecord = LocalDatabase['media_files_downloads'];
export type DownloadQueueRecord = LocalDatabase['download_queue'];

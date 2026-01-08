import { UpdateType } from '@powersync/react-native';

/**
 * Tables that are allowed to upload changes to the backend.
 * Anything not on this list will be treated as read-only (download-only) on the client.
 *
 * Keep this list narrowly scoped to user-owned and analytics tables.
 */
export const UPLOAD_ALLOWED_TABLES: ReadonlySet<string> = new Set<string>([
  // Upload-only analytics tables
  'sessions',
  'app_downloads',
  'chapter_listens',
  'media_file_listens',
  'verse_listens',
  'shares',
  'share_opens',

  // Two-way user-owned tables
  'user_current_selections',
  'user_saved_text_versions',
  'user_saved_audio_versions',
  'user_bookmarks',
  'user_bookmark_folders',
  'user_saved_image_sets',
  'user_playlist_groups',
  'user_playlists',
  'playlists',
  'playlist_items',
]);

/**
 * Returns whether a specific operation on a table is allowed to be uploaded.
 * Currently operation type is not used, but kept for future flexibility.
 */
export function isUploadAllowed(table: string, _op: UpdateType): boolean {
  return UPLOAD_ALLOWED_TABLES.has(table);
}

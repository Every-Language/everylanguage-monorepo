# User Data Domain

User data stores individual user preferences and content for the Bible app.

## Purpose

This domain stores personal user data:

- Saved playlists and playlist groups
- Bookmarks and bookmark folders
- Saved audio/text versions
- Version selections (user's preferred versions)
- Current playback selections
- User contributions (feedback, submissions)

## Tables

### `user_playlists`

User-created playlists of passages/content.

### `user_playlist_groups`

Organizational folders for grouping playlists.

### `playlist_items`

Items within playlists (verses, chapters, passages).

### `user_bookmarks`

User bookmarks for specific verses or passages.

### `user_bookmark_folders`

Organizational folders for bookmarks.

### `user_saved_audio_versions`

User's saved/favorited audio versions.

### `user_saved_text_versions`

User's saved/favorited text versions.

### `user_saved_image_sets`

User's saved image sets.

### `user_version_selections`

User's preferred/default versions for each language.

### `user_current_selections`

Current playback state (what the user is currently listening to/reading).

### `user_contributions`

User-submitted content (translations, corrections, etc.).

### `verse_feedback`

User feedback on verse translations (quality, accuracy, etc.).

## Notes

- All tables use `user_id` (not `created_by`) to indicate personal data
- Anonymous users can have data via `anon_user_id` in some tables
- Data is private to each user (RLS enforces `user_id = auth.uid()`)

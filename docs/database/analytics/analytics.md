# Analytics Domain

Analytics tracks user behavior, app usage, and content consumption for the Bible app.

## Purpose

This domain stores:

- App downloads with attribution
- User sessions and activity
- Content listening data (chapters, verses, media files)
- Share tracking (how content is shared and opened)
- Geographic distribution of usage (for heatmaps)

## Tables

### `users_anon`

Anonymous users identified by device ID. Links to authenticated users when they sign in.

### `sessions`

User sessions tracking app usage periods. Includes location, connectivity, platform, and device info.

### `app_downloads`

App download events with attribution (which share link led to download). Includes geographic location.

### `chapter_listens`

Tracks when users listen to chapters. Links to sessions and shares.

### `verse_listens`

Tracks when users listen to individual verses.

### `media_file_listens`

Tracks media file playback with position and duration. Used for detailed analytics.

### `shares`

Share link creation events. Tracks what content was shared (app, chapter, playlist, verse, passage).

### `share_opens`

Tracks when share links are opened. Used for attribution.

## Views

### `vw_language_listens_heatmap`

Aggregated listening data by language for heatmap visualization.

### `vw_country_language_listens_heatmap`

Aggregated listening data by country and language.

### `vw_language_listens_stats`

Statistics about language listening patterns.

### `mv_language_listens_stats`

Materialized view of language listening statistics (refreshed periodically).

## Usage

Analytics data is used to:

- Create heatmaps showing Bible listening across the world
- Track app growth and user engagement
- Measure content effectiveness
- Provide attribution for shares

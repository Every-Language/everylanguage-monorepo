# Bible Progress Functions & Triggers

Functions and triggers related to Bible progress calculation and materialized view refresh.

## Functions

### `enqueue_progress_refresh(kind_in TEXT, version_in UUID)`

Queues a version for progress recalculation.

- Parameters:
  - `kind_in`: `'audio'` or `'text'`
  - `version_in`: Version UUID
- Used by: Triggers when content changes

### `drain_progress_refresh_queue()`

Processes queued progress refreshes.

- Returns: Table of processed items (`kind`, `version_id`)
- Used by: Background jobs to refresh materialized views

### `refresh_progress_materialized_views_concurrently()`

Refreshes progress materialized views without blocking.

- Refreshes: `mv_audio_version_progress_summary`, `mv_text_version_progress_summary`
- Used by: Scheduled jobs

### `refresh_progress_materialized_views_full()`

Full refresh of all progress materialized views.

- Used by: Manual refresh or after major data changes

### `refresh_progress_materialized_views_safe()`

Safe refresh that handles errors gracefully.

- Used by: Background jobs with error handling

## Triggers

### `enqueue_media_files`

**Trigger** - Queues progress refresh when media files change.

- Fires on: `INSERT`, `UPDATE`, `DELETE` on `media_files`
- Calls: `enqueue_progress_refresh('audio', ...)`

### `enqueue_media_files_verses`

**Trigger** - Queues progress refresh when verse-media relationships change.

- Fires on: `INSERT`, `UPDATE`, `DELETE` on `media_files_verses`
- Calls: `enqueue_progress_refresh('audio', ...)`

### `enqueue_verse_texts`

**Trigger** - Queues progress refresh when verse texts change.

- Fires on: `INSERT`, `UPDATE`, `DELETE` on `verse_texts`
- Calls: `enqueue_progress_refresh('text', ...)`

## Related Documentation

- [Bible Progress](./bible-progress.md) - Progress views and refresh mechanism
- [Progress Coverage and Refresh](./progress-coverage-and-refresh.md) - Detailed refresh documentation

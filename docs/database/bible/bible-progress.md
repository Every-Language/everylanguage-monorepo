# Bible Progress Views & Materialized Views

Aggregate views that calculate Bible translation progress per version.

## Purpose

These views aggregate completion status for:

- Audio versions (how much of the Bible has been recorded)
- Text versions (how much of the Bible has been translated)

Progress is calculated at multiple granularities (verse, chapter, book) and aggregated up.

## Views

### `audio_version_progress_summary`

Real-time view showing progress for audio versions.

### `text_version_progress_summary`

Real-time view showing progress for text versions.

### `mv_audio_version_progress_summary`

Materialized view for audio version progress (refreshed periodically for performance).

### `mv_text_version_progress_summary`

Materialized view for text version progress (refreshed periodically for performance).

### `language_entity_best_audio_version`

Best audio version per language entity (most complete).

### `language_entity_best_text_version`

Best text version per language entity (most complete).

## Refresh Mechanism

- `progress_refresh_queue` - Queue of versions that need progress recalculation
- `enqueue_progress_refresh()` - Function to queue a refresh
- `refresh_progress_materialized_views_concurrently()` - Refresh MVs without blocking
- `refresh_progress_materialized_views_full()` - Full refresh of all MVs

## Usage

Progress views are used by:

- Frontend dashboards to show completion percentages
- Partner org dashboards to track project progress
- Admin dashboards for reporting

See [Progress Coverage and Refresh](../bible/progress-coverage-and-refresh.md) for detailed documentation.

## Related Documentation

- [Functions & Triggers](./functions-and-triggers.md) - Progress refresh functions and triggers

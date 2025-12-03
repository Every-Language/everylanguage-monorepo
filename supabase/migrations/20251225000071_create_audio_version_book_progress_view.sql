-- Convert audio_version_book_progress from Materialized View to View
-- ============================================================
-- Converts the MV to a regular view for real-time accuracy.
-- Adds composite indexes for optimal query performance.
-- Removes MV from refresh functions.
BEGIN;


-- Drop the materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS audio_version_book_progress cascade;


-- Create composite index on media_files for optimal view performance
-- This index covers the exact query pattern used in the view
CREATE INDEX if NOT EXISTS idx_media_files_audio_chapter_optimized ON media_files (audio_version_id, chapter_id)
WHERE
  deleted_at IS NULL
  AND media_type = 'audio'
  AND is_bible_audio IS TRUE
  AND upload_status = 'completed'
  AND publish_status = 'published'
  AND chapter_id IS NOT NULL
  AND audio_version_id IS NOT NULL;


-- Create the view (real-time, no refresh needed)
CREATE VIEW audio_version_book_progress AS
WITH
  -- Scope: active audio versions
  scope AS (
    SELECT
      av.id,
      av.bible_version_id
    FROM
      audio_versions av
    WHERE
      av.deleted_at IS NULL
  ),
  -- Chapters with audio coverage (simple: if media_file exists with chapter_id, chapter is covered)
  chapters_with_audio AS (
    SELECT DISTINCT
      mf.audio_version_id,
      mf.chapter_id
    FROM
      media_files mf
    WHERE
      mf.deleted_at IS NULL
      AND mf.media_type = 'audio'
      AND mf.is_bible_audio IS TRUE
      AND mf.upload_status = 'completed'
      AND mf.publish_status = 'published'
      AND mf.chapter_id IS NOT NULL
      AND mf.audio_version_id IS NOT NULL
  ),
  -- Get all books and chapters for each audio version
  books_chapters AS (
    SELECT DISTINCT
      s.id AS audio_version_id,
      b.id AS book_id,
      c.id AS chapter_id
    FROM
      scope s
      JOIN books b ON b.bible_version_id = s.bible_version_id
      JOIN chapters c ON c.book_id = b.id
  ),
  -- Aggregate to book level: count chapters with audio per book
  book_progress AS (
    SELECT
      bc.audio_version_id,
      bc.book_id,
      COUNT(*) FILTER (
        WHERE
          cwa.chapter_id IS NOT NULL
      ) AS chapters_with_audio,
      COUNT(*) AS total_chapters
    FROM
      books_chapters bc
      LEFT JOIN chapters_with_audio cwa ON cwa.audio_version_id = bc.audio_version_id
      AND cwa.chapter_id = bc.chapter_id
    GROUP BY
      bc.audio_version_id,
      bc.book_id
  )
SELECT
  bp.audio_version_id,
  bp.book_id,
  bp.chapters_with_audio,
  bp.total_chapters
FROM
  book_progress bp;


comment ON view audio_version_book_progress IS 'View tracking chapter progress per book for each audio version. Real-time accuracy, no refresh needed.';


-- Update refresh functions to remove audio_version_book_progress (no longer an MV)
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW audio_version_progress;
  REFRESH MATERIALIZED VIEW text_version_progress;
  -- audio_version_book_progress is now a view, not an MV, so no refresh needed
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY text_version_progress;
  -- audio_version_book_progress is now a view, not an MV, so no refresh needed
END;
$$;


COMMIT;

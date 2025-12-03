-- Create audio_version_book_progress Materialized View
-- ============================================================
-- Creates a materialized view that tracks chapter progress per book for each audio version.
-- This enables efficient querying of book-level progress breakdowns.
-- Reuses the same logic as audio_version_progress but aggregates to book level.
BEGIN;


-- Create the materialized view
CREATE MATERIALIZED VIEW audio_version_book_progress AS
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


-- Create unique index for concurrent refresh support
CREATE UNIQUE INDEX audio_version_book_progress_pkey ON audio_version_book_progress (audio_version_id, book_id);


-- Create index on audio_version_id for efficient filtering
CREATE INDEX audio_version_book_progress_audio_version_id_idx ON audio_version_book_progress (audio_version_id);


-- Create index on book_id for joins with books table
CREATE INDEX audio_version_book_progress_book_id_idx ON audio_version_book_progress (book_id);


comment ON materialized view audio_version_book_progress IS 'Materialized view tracking chapter progress per book for each audio version. Enables efficient book-level progress breakdowns.';


-- Update refresh functions to include the new MV
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW audio_version_progress;
  REFRESH MATERIALIZED VIEW text_version_progress;
  REFRESH MATERIALIZED VIEW audio_version_book_progress;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY text_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_book_progress;
END;
$$;


COMMIT;

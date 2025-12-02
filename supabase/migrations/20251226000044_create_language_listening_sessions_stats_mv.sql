-- Create language_listening_sessions_stats Materialized View
-- ============================================================
-- Creates a materialized view that aggregates listening session statistics by language_entity_id.
-- This enables efficient querying of distinct session counts and total duration without scanning
-- large listens tables on every query.
-- Supports concurrent refresh for non-blocking updates.
BEGIN;


-- Create the materialized view
CREATE MATERIALIZED VIEW language_listening_sessions_stats AS
WITH
  -- Combine all listens from both tables
  combined_listens AS (
    SELECT
      language_entity_id,
      session_id,
      duration_seconds
    FROM
      media_file_listens
    WHERE
      session_id IS NOT NULL
      AND language_entity_id IS NOT NULL
    UNION ALL
    SELECT
      language_entity_id,
      session_id,
      -- verse_listens doesn't have duration, so use 0 or NULL
      -- We'll only count duration from media_file_listens
      NULL::REAL AS duration_seconds
    FROM
      verse_listens
    WHERE
      session_id IS NOT NULL
      AND language_entity_id IS NOT NULL
  ),
  -- Aggregate by language_entity_id
  language_stats AS (
    SELECT
      language_entity_id,
      COUNT(DISTINCT session_id) AS distinct_sessions,
      -- Sum duration only from media_file_listens (where duration_seconds is not NULL)
      COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds
    FROM
      combined_listens
    GROUP BY
      language_entity_id
  )
SELECT
  ls.language_entity_id,
  ls.distinct_sessions,
  ls.total_duration_seconds
FROM
  language_stats ls;


-- Create unique index for concurrent refresh support
CREATE UNIQUE INDEX language_listening_sessions_stats_pkey ON language_listening_sessions_stats (language_entity_id);


-- Create index on language_entity_id for efficient filtering (redundant but explicit)
CREATE INDEX language_listening_sessions_stats_language_entity_id_idx ON language_listening_sessions_stats (language_entity_id);


comment ON materialized view language_listening_sessions_stats IS 'Materialized view aggregating listening session statistics by language_entity_id. Includes distinct session count and total duration (from media_file_listens only). Refresh periodically or on-demand for optimal performance.';


-- Update refresh functions to include the new MV
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW audio_version_progress;
  REFRESH MATERIALIZED VIEW text_version_progress;
  REFRESH MATERIALIZED VIEW language_listening_sessions_stats;
END;
$$;


CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY text_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_listening_sessions_stats;
END;
$$;


COMMIT;

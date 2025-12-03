-- Global Sessions Heatmap View
-- Aggregates all sessions by grid location for global heatmap visualization
-- Includes session metrics, language distribution, and recent activity tracking
-- Drop view if exists (idempotent)
DO $$ BEGIN EXECUTE 'DROP VIEW IF EXISTS vw_global_sessions_heatmap'; EXCEPTION WHEN others THEN NULL; END $$;


CREATE OR REPLACE VIEW vw_global_sessions_heatmap AS
WITH
  -- Calculate session duration, capped at 24 hours (86400 seconds)
  -- This prevents unclosed sessions from overwhelming the heatmap intensity calculation
  sessions_with_duration AS (
    SELECT
      s.id,
      s.location,
      s.started_at,
      s.ended_at,
      s.language_entity_id,
      -- Calculate duration: ended_at - started_at, or NOW() - started_at if still active
      -- Cap at 24 hours to prevent outliers from skewing intensity
      LEAST(
        COALESCE(
          EXTRACT(
            epoch
            FROM
              (s.ended_at - s.started_at)
          ),
          EXTRACT(
            epoch
            FROM
              (NOW() - s.started_at)
          )
        ),
        86400 -- 24 hours in seconds
      ) AS duration_seconds
    FROM
      public.sessions s
    WHERE
      s.location IS NOT NULL
  ),
  -- Get most recent chapter listen per session for animation pulsing
  session_recent_listens AS (
    SELECT
      cl.session_id,
      MAX(cl.listened_at) AS last_chapter_listen_at
    FROM
      public.chapter_listens cl
    GROUP BY
      cl.session_id
  ),
  -- Aggregate by grid cell
  grid_aggregates AS (
    SELECT
      st_snaptogrid (swd.location, 0.5, 0.5) AS grid,
      COUNT(DISTINCT swd.id) AS session_count,
      SUM(swd.duration_seconds) AS total_duration_seconds,
      MAX(swd.started_at) AS most_recent_session_start,
      MAX(srl.last_chapter_listen_at) AS most_recent_chapter_listen,
      -- Language distribution as JSONB array of distinct language_entity_ids
      -- Store all languages in grid cell for hover tooltips
      JSONB_AGG(DISTINCT swd.language_entity_id) FILTER (
        WHERE
          swd.language_entity_id IS NOT NULL
      ) AS languages
    FROM
      sessions_with_duration swd
      LEFT JOIN session_recent_listens srl ON srl.session_id = swd.id
    GROUP BY
      st_snaptogrid (swd.location, 0.5, 0.5)
  )
SELECT
  grid,
  session_count,
  total_duration_seconds,
  most_recent_session_start,
  most_recent_chapter_listen,
  languages,
  -- Intensity calculation: session_count * log(capped_duration + 1)
  -- The log prevents very long sessions from dominating, and the +1 ensures log(1) = 0 for zero duration
  -- Duration is already capped at 24 hours in the CTE above
  session_count * LOG(GREATEST(total_duration_seconds, 1) + 1) AS intensity
FROM
  grid_aggregates;


comment ON view vw_global_sessions_heatmap IS 'Global sessions heatmap aggregated by 0.5° grid cells. Includes session metrics, language distribution, and recent activity timestamps. Duration capped at 24 hours to prevent unclosed sessions from skewing intensity calculations.';

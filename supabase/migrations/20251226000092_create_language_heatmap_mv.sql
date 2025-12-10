-- Create combined language_heatmap materialized view and drop old views
-- Migration: 20251226000062_create_language_heatmap_mv.sql
-- Combines vw_global_sessions_heatmap and vw_language_listens_heatmap into a single MV
BEGIN;


-- Increase statement timeout for materialized view operations
SET
  local statement_timeout = '300s';


-- ============================================================================
-- STEP 1: Create language_heatmap materialized view
-- ============================================================================
CREATE MATERIALIZED VIEW language_heatmap AS
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
      AND s.language_entity_id IS NOT NULL
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
  -- Aggregate by language_entity_id AND grid cell
  grid_aggregates AS (
    SELECT
      swd.language_entity_id,
      st_snaptogrid (swd.location, 0.5, 0.5) AS grid,
      COUNT(DISTINCT swd.id) AS session_count,
      SUM(swd.duration_seconds) AS total_duration_seconds,
      MAX(swd.started_at) AS most_recent_session_start,
      MAX(srl.last_chapter_listen_at) AS most_recent_chapter_listen
    FROM
      sessions_with_duration swd
      LEFT JOIN session_recent_listens srl ON srl.session_id = swd.id
    GROUP BY
      swd.language_entity_id,
      st_snaptogrid (swd.location, 0.5, 0.5)
  )
SELECT
  language_entity_id,
  grid,
  session_count,
  total_duration_seconds,
  most_recent_session_start,
  most_recent_chapter_listen,
  -- Intensity calculation: session_count * log(capped_duration + 1)
  -- The log prevents very long sessions from dominating, and the +1 ensures log(1) = 0 for zero duration
  -- Duration is already capped at 24 hours in the CTE above
  session_count * LOG(GREATEST(total_duration_seconds, 1) + 1) AS intensity
FROM
  grid_aggregates;


-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_language_heatmap_unique ON language_heatmap (language_entity_id, grid);


-- Spatial index on grid for spatial queries
CREATE INDEX idx_language_heatmap_grid ON language_heatmap USING gist (grid);


-- Index on language_entity_id for filtering
CREATE INDEX idx_language_heatmap_language_entity_id ON language_heatmap (language_entity_id);


-- Index on most_recent_session_start for time filtering
CREATE INDEX idx_language_heatmap_most_recent_session_start ON language_heatmap (most_recent_session_start)
WHERE
  most_recent_session_start IS NOT NULL;


comment ON materialized view language_heatmap IS 'Combined language heatmap aggregated by language_entity_id and 0.5° grid cells. Includes ALL sessions (not just those with listen events), grouped by language and grid. Includes session metrics and recent activity timestamps. Duration capped at 24 hours to prevent unclosed sessions from skewing intensity calculations.';


-- ============================================================================
-- STEP 2: Update RPC function that uses old view
-- ============================================================================
-- get_language_heatmap(...) (renamed from get_global_sessions_heatmap_from_view)
CREATE OR REPLACE FUNCTION public.get_language_heatmap (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_time_period_hours INTEGER,
  p_point_limit INTEGER DEFAULT 20000,
  p_language_entity_id UUID DEFAULT NULL,
  p_region_id UUID DEFAULT NULL
) returns TABLE (
  lon DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  intensity DOUBLE PRECISION,
  session_count BIGINT,
  total_duration_seconds DOUBLE PRECISION,
  most_recent_session_start TIMESTAMPTZ,
  most_recent_chapter_listen TIMESTAMPTZ,
  languages JSONB,
  age_normalized DOUBLE PRECISION
) language sql stable security definer
SET
  search_path = public AS $$
  WITH
    -- Create bounding box geometry for spatial filtering
    bbox AS (
      SELECT ST_SetSRID(
        ST_MakeBox2D(
          ST_Point(p_min_lng, p_min_lat),
          ST_Point(p_max_lng, p_max_lat)
        ),
        4326
      ) AS geom
    ),
    -- Get region boundary if filtering by region
    region_filter AS (
      SELECT boundary
      FROM regions
      WHERE id = p_region_id
        AND deleted_at IS NULL
        AND boundary IS NOT NULL
      LIMIT 1
    )
  SELECT
    ST_X(lh.grid) AS lon,
    ST_Y(lh.grid) AS lat,
    lh.intensity,
    lh.session_count,
    lh.total_duration_seconds,
    lh.most_recent_session_start,
    lh.most_recent_chapter_listen,
    -- Return language_entity_id as single-element JSONB array for compatibility with frontend
    jsonb_build_array(lh.language_entity_id) AS languages,
    CASE
      WHEN lh.most_recent_session_start IS NOT NULL THEN
        GREATEST(
          0,
          LEAST(
            1,
            1 - EXTRACT(EPOCH FROM (NOW() - lh.most_recent_session_start)) / (p_time_period_hours * 3600.0)
          )
        )
      ELSE 0
    END AS age_normalized
  FROM
    language_heatmap lh
    CROSS JOIN bbox
    LEFT JOIN region_filter rf ON p_region_id IS NOT NULL
  WHERE
    -- Spatial filtering
    lh.grid && bbox.geom
    -- Time filtering
    AND (
      lh.most_recent_session_start IS NULL
      OR lh.most_recent_session_start >= NOW() - (p_time_period_hours || ' hours')::INTERVAL
    )
    -- Language filtering
    AND (
      p_language_entity_id IS NULL
      OR lh.language_entity_id = p_language_entity_id
    )
    -- Region filtering: check if grid point is within region boundary
    AND (
      p_region_id IS NULL
      OR (
        EXISTS (SELECT 1 FROM region_filter)
        AND rf.boundary IS NOT NULL
        AND ST_Intersects(lh.grid, rf.boundary)
      )
    )
  ORDER BY
    lh.session_count DESC,
    lh.total_duration_seconds DESC
  LIMIT p_point_limit;
$$;


comment ON function public.get_language_heatmap (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER,
  UUID,
  UUID
) IS 'Queries language_heatmap materialized view with PostGIS spatial filtering. Supports filtering by language_entity_id and region_id. Region filtering uses ST_Intersects to check if grid point is within region boundary. Uses SECURITY DEFINER to bypass RLS policies for analytics aggregation.';


-- ============================================================================
-- STEP 3: Drop old views
-- ============================================================================
DROP VIEW if EXISTS vw_global_sessions_heatmap cascade;


DROP VIEW if EXISTS vw_language_listens_heatmap cascade;


-- Reset statement timeout
RESET statement_timeout;


COMMIT;

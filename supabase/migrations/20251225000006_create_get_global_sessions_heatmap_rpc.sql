-- RPC Function: get_global_sessions_heatmap
-- Optimized PostGIS function for fetching global sessions heatmap data
-- Performs spatial filtering (bbox), time filtering, and aggregation at database level
-- Uses spatial index on sessions.location for efficient bbox queries
CREATE OR REPLACE FUNCTION public.get_global_sessions_heatmap (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_time_period_hours INTEGER,
  p_grid_size DOUBLE PRECISION DEFAULT 0.5,
  p_point_limit INTEGER DEFAULT 20000
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
            EXTRACT(EPOCH FROM (s.ended_at - s.started_at)),
            EXTRACT(EPOCH FROM (NOW() - s.started_at))
          ),
          86400 -- 24 hours in seconds
        ) AS duration_seconds
      FROM
        public.sessions s
      CROSS JOIN bbox
      WHERE
        s.location IS NOT NULL
        -- Spatial filtering using && operator (uses spatial index)
        AND s.location && bbox.geom
        -- Time filtering: only sessions within the time period
        AND s.started_at >= NOW() - (p_time_period_hours || ' hours')::INTERVAL
    ),
    -- Get most recent chapter listen per session for animation pulsing
    session_recent_listens AS (
      SELECT
        cl.session_id,
        MAX(cl.listened_at) AS last_chapter_listen_at
      FROM
        public.chapter_listens cl
      INNER JOIN sessions_with_duration swd ON cl.session_id = swd.id
      GROUP BY
        cl.session_id
    ),
    -- Aggregate by grid cell with dynamic grid size
    grid_aggregates AS (
      SELECT
        st_snaptogrid(swd.location, p_grid_size, p_grid_size) AS grid,
        COUNT(DISTINCT swd.id) AS session_count,
        SUM(swd.duration_seconds) AS total_duration_seconds,
        MAX(swd.started_at) AS most_recent_session_start,
        MAX(srl.last_chapter_listen_at) AS most_recent_chapter_listen,
        -- Language distribution as JSONB array of distinct language_entity_ids
        -- Store all languages in grid cell for hover tooltips
        jsonb_agg(DISTINCT swd.language_entity_id) FILTER (
          WHERE swd.language_entity_id IS NOT NULL
        ) AS languages
      FROM
        sessions_with_duration swd
        LEFT JOIN session_recent_listens srl ON srl.session_id = swd.id
      GROUP BY
        st_snaptogrid(swd.location, p_grid_size, p_grid_size)
    )
  SELECT
    ST_X(ga.grid) AS lon,
    ST_Y(ga.grid) AS lat,
    -- Intensity calculation: session_count * log(capped_duration + 1)
    -- The log prevents very long sessions from dominating, and the +1 ensures log(1) = 0 for zero duration
    -- Duration is already capped at 24 hours in the CTE above
    ga.session_count * LOG(GREATEST(ga.total_duration_seconds, 1) + 1) AS intensity,
    ga.session_count,
    ga.total_duration_seconds,
    ga.most_recent_session_start,
    ga.most_recent_chapter_listen,
    COALESCE(ga.languages, '[]'::jsonb) AS languages,
    -- Calculate age_normalized: 0 (oldest) to 1 (most recent) relative to time period
    -- Formula: 1 - (time_since_start / time_period)
    CASE
      WHEN ga.most_recent_session_start IS NOT NULL THEN
        GREATEST(
          0,
          LEAST(
            1,
            1 - EXTRACT(EPOCH FROM (NOW() - ga.most_recent_session_start)) / (p_time_period_hours * 3600.0)
          )
        )
      ELSE 0
    END AS age_normalized
  FROM
    grid_aggregates ga
  ORDER BY
    ga.session_count DESC,
    ga.total_duration_seconds DESC
  LIMIT p_point_limit;
$$;


comment ON function public.get_global_sessions_heatmap (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  DOUBLE PRECISION,
  INTEGER
) IS 'Optimized PostGIS RPC function for fetching global sessions heatmap data. Performs spatial filtering (bbox) using spatial index, time filtering, and aggregation at database level. Returns grid-aggregated session data with intensity, language distribution, and age normalization.';

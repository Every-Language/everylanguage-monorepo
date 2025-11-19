-- RPC Function: get_global_sessions_heatmap_from_view
-- Queries the existing vw_global_sessions_heatmap view with PostGIS spatial filtering
-- This maintains consistent grid positions (no jumping on zoom) while providing efficient bbox filtering
-- Uses SECURITY DEFINER to bypass RLS policies for analytics aggregation
CREATE OR REPLACE FUNCTION public.get_global_sessions_heatmap_from_view (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_time_period_hours INTEGER,
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
    )
  SELECT
    ST_X(v.grid) AS lon,
    ST_Y(v.grid) AS lat,
    v.intensity,
    v.session_count,
    v.total_duration_seconds,
    v.most_recent_session_start,
    v.most_recent_chapter_listen,
    COALESCE(v.languages, '[]'::jsonb) AS languages,
    -- Calculate age_normalized: 0 (oldest) to 1 (most recent) relative to time period
    -- Formula: 1 - (time_since_start / time_period)
    CASE
      WHEN v.most_recent_session_start IS NOT NULL THEN
        GREATEST(
          0,
          LEAST(
            1,
            1 - EXTRACT(EPOCH FROM (NOW() - v.most_recent_session_start)) / (p_time_period_hours * 3600.0)
          )
        )
      ELSE 0
    END AS age_normalized
  FROM
    vw_global_sessions_heatmap v
  CROSS JOIN bbox
  WHERE
    -- Spatial filtering using && operator (uses spatial index on sessions.location via view)
    v.grid && bbox.geom
    -- Time filtering: only sessions within the time period
    AND (
      v.most_recent_session_start IS NULL
      OR v.most_recent_session_start >= NOW() - (p_time_period_hours || ' hours')::INTERVAL
    )
  ORDER BY
    v.session_count DESC,
    v.total_duration_seconds DESC
  LIMIT p_point_limit;
$$;


comment ON function public.get_global_sessions_heatmap_from_view (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER
) IS 'Queries vw_global_sessions_heatmap view with PostGIS spatial filtering. Maintains consistent grid positions (no jumping on zoom) while providing efficient bbox filtering. Uses SECURITY DEFINER to bypass RLS policies for analytics aggregation.';

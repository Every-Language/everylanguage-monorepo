-- Add language and region filtering to get_global_sessions_heatmap_from_view RPC
-- When filters are provided, query sessions table directly and filter before aggregation
-- When no filters are provided, query the view as before (for performance)
-- Uses SECURITY DEFINER to bypass RLS policies for analytics aggregation
CREATE OR REPLACE FUNCTION public.get_global_sessions_heatmap_from_view (
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
  -- If no filters provided, use the view (fast path)
  SELECT
    ST_X(ga.grid) AS lon,
    ST_Y(ga.grid) AS lat,
    ga.intensity,
    ga.session_count,
    ga.total_duration_seconds,
    ga.most_recent_session_start,
    ga.most_recent_chapter_listen,
    COALESCE(ga.languages, '[]'::jsonb) AS languages,
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
  FROM (
    WITH
      -- Calculate session duration, capped at 24 hours
      sessions_with_duration AS (
        SELECT
          s.id,
          s.location,
          s.started_at,
          s.ended_at,
          s.language_entity_id,
          LEAST(
            COALESCE(
              EXTRACT(EPOCH FROM (s.ended_at - s.started_at)),
              EXTRACT(EPOCH FROM (NOW() - s.started_at))
            ),
            86400
          ) AS duration_seconds
        FROM
          public.sessions s
        CROSS JOIN bbox
        LEFT JOIN region_filter rf ON p_region_id IS NOT NULL
        WHERE
          s.location IS NOT NULL
          -- Bbox filtering
          AND s.location && bbox.geom
          -- Time filtering
          AND s.started_at >= NOW() - (p_time_period_hours || ' hours')::INTERVAL
          -- Language filtering: check if session has listen events for the specified language
          AND (
            p_language_entity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM chapter_listens cl
              WHERE cl.session_id = s.id
                AND cl.language_entity_id = p_language_entity_id
              UNION
              SELECT 1
              FROM verse_listens vl
              WHERE vl.session_id = s.id
                AND vl.language_entity_id = p_language_entity_id
              UNION
              SELECT 1
              FROM media_file_listens mfl
              WHERE mfl.session_id = s.id
                AND mfl.language_entity_id = p_language_entity_id
            )
          )
          -- Region filtering: check if session location is within region boundary
          -- If region_id is provided but region_filter is empty (region not found), return no rows
          AND (
            p_region_id IS NULL
            OR (
              EXISTS (SELECT 1 FROM region_filter)
              AND rf.boundary IS NOT NULL
              AND ST_Intersects(s.location, rf.boundary)
            )
          )
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
      -- Aggregate by grid cell
      grid_aggregates AS (
        SELECT
          st_snaptogrid(swd.location, 0.5, 0.5) AS grid,
          COUNT(DISTINCT swd.id) AS session_count,
          SUM(swd.duration_seconds) AS total_duration_seconds,
          MAX(swd.started_at) AS most_recent_session_start,
          MAX(srl.last_chapter_listen_at) AS most_recent_chapter_listen,
          jsonb_agg(DISTINCT swd.language_entity_id) FILTER (
            WHERE swd.language_entity_id IS NOT NULL
          ) AS languages
        FROM
          sessions_with_duration swd
          LEFT JOIN session_recent_listens srl ON srl.session_id = swd.id
        GROUP BY
          st_snaptogrid(swd.location, 0.5, 0.5)
      )
    SELECT
      grid,
      session_count,
      total_duration_seconds,
      most_recent_session_start,
      most_recent_chapter_listen,
      languages,
      session_count * LOG(GREATEST(total_duration_seconds, 1) + 1) AS intensity
    FROM
      grid_aggregates
  ) ga
  WHERE
    (p_language_entity_id IS NOT NULL OR p_region_id IS NOT NULL)
  -- If no filters, use view instead
  UNION ALL
  SELECT
    ST_X(v.grid) AS lon,
    ST_Y(v.grid) AS lat,
    v.intensity,
    v.session_count,
    v.total_duration_seconds,
    v.most_recent_session_start,
    v.most_recent_chapter_listen,
    COALESCE(v.languages, '[]'::jsonb) AS languages,
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
    (p_language_entity_id IS NULL AND p_region_id IS NULL)
    AND v.grid && bbox.geom
    AND (
      v.most_recent_session_start IS NULL
      OR v.most_recent_session_start >= NOW() - (p_time_period_hours || ' hours')::INTERVAL
    )
  ORDER BY
    session_count DESC,
    total_duration_seconds DESC
  LIMIT p_point_limit;
$$;


comment ON function public.get_global_sessions_heatmap_from_view (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER,
  UUID,
  UUID
) IS 'Queries vw_global_sessions_heatmap view with PostGIS spatial filtering when no filters are provided (fast path). When language_entity_id or region_id filters are provided, queries sessions table directly and filters before aggregation. Language filtering checks if sessions have listen events (chapter_listens, verse_listens, media_file_listens) for the specified language. Region filtering uses ST_Intersects to check if session location is within region boundary. Uses SECURITY DEFINER to bypass RLS policies for analytics aggregation.';

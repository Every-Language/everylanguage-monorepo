-- 20251225000028_debug_language_coordinates_query.sql
-- Add debug logging to diagnose missing points issue
-- Temporarily adds a debug function that logs query parameters and result counts
BEGIN;


-- Create a debug helper function to check materialized view stats
CREATE OR REPLACE FUNCTION debug_language_coordinates_stats (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_location_source TEXT DEFAULT NULL
) returns TABLE (
  total_in_mv BIGINT,
  total_in_bbox BIGINT,
  total_in_bbox_with_source_filter BIGINT,
  mv_sample_count BIGINT,
  bbox_sample_count BIGINT
) language sql stable security invoker AS $$
  WITH
    bbox AS (
      SELECT ST_SetSRID(
        ST_MakeBox2D(
          ST_Point(p_min_lng, p_min_lat),
          ST_Point(p_max_lng, p_max_lat)
        ),
        4326
      ) AS geom
    ),
    mv_stats AS (
      SELECT COUNT(*) AS total FROM language_coordinates_for_map
    ),
    bbox_stats AS (
      SELECT COUNT(*) AS total
      FROM language_coordinates_for_map lcm
      CROSS JOIN bbox
      WHERE lcm.location && bbox.geom
    ),
    bbox_filtered_stats AS (
      SELECT COUNT(*) AS total
      FROM language_coordinates_for_map lcm
      CROSS JOIN bbox
      WHERE lcm.location && bbox.geom
        AND (
          p_location_source IS NULL
          OR lcm.location_source = p_location_source
        )
    )
  SELECT
    (SELECT total FROM mv_stats) AS total_in_mv,
    (SELECT total FROM bbox_stats) AS total_in_bbox,
    (SELECT total FROM bbox_filtered_stats) AS total_in_bbox_with_source_filter,
    (SELECT COUNT(*) FROM language_coordinates_for_map LIMIT 10) AS mv_sample_count,
    (SELECT COUNT(*) FROM language_coordinates_for_map lcm CROSS JOIN bbox WHERE lcm.location && bbox.geom LIMIT 10) AS bbox_sample_count;
$$;


-- Update main function to use more precise spatial filtering
-- The issue might be that && checks bounding box overlap, but we need points within the bbox
CREATE OR REPLACE FUNCTION get_all_language_coordinates (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 10000,
  p_location_source TEXT DEFAULT NULL
) returns TABLE (
  language_entity_id UUID,
  language_name TEXT,
  region_id UUID,
  region_name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_source TEXT,
  -- Bible translation status fields from unified_bible_translation_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  iso639_3 TEXT,
  rolv_code TEXT,
  bible_stats_computed_at TIMESTAMPTZ
) language sql stable security invoker
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
    lcm.language_entity_id,
    lcm.language_name,
    lcm.region_id,
    lcm.region_name,
    lcm.longitude,
    lcm.latitude,
    lcm.location_source,
    -- Bible translation status (pre-joined in materialized view)
    lcm.has_full_audio_bible,
    lcm.has_audio_portions,
    lcm.has_text_portions,
    lcm.iso639_3,
    lcm.rolv_code,
    lcm.bible_stats_computed_at
  FROM
    language_coordinates_for_map lcm
    CROSS JOIN bbox
  WHERE
    -- Use ST_Within for more precise filtering: point must be within bbox boundaries
    -- This is more accurate than && which checks bounding box overlap
    ST_Within(lcm.location, bbox.geom)
    AND (
      p_location_source IS NULL
      OR lcm.location_source = p_location_source
    )
  -- No ORDER BY for performance - not needed for map rendering
  -- PostgreSQL can use spatial index efficiently and apply LIMIT early
  LIMIT p_limit;
$$;


comment ON function get_all_language_coordinates (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT
) IS 'Returns language coordinate points filtered by bounding box (viewport), optionally filtered by location_source, including bible translation status. Uses materialized view language_coordinates_for_map for optimal performance. DEBUG VERSION: Uses ST_Within for more precise spatial filtering.';


comment ON function debug_language_coordinates_stats (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TEXT
) IS 'Debug helper function to check materialized view statistics and bbox filtering counts. Use this to diagnose missing points issues.';


COMMIT;

-- 20251225000029_fix_spatial_filtering_and_add_debug.sql
-- Fix: Revert to && operator (better spatial index usage) and add coordinate-based filtering as backup
-- The issue is likely that ST_Within doesn't use the GIST index as efficiently as &&
BEGIN;


-- Revert to && operator which uses spatial index efficiently
-- Also add explicit coordinate range check as backup for precision
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
    -- Use && operator for efficient spatial index usage
    -- This is faster than ST_Within and uses the GIST index properly
    lcm.location && bbox.geom
    -- Add explicit coordinate range check for precision (handles edge cases)
    AND lcm.longitude >= p_min_lng
    AND lcm.longitude <= p_max_lng
    AND lcm.latitude >= p_min_lat
    AND lcm.latitude <= p_max_lat
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
) IS 'Returns language coordinate points filtered by bounding box (viewport), optionally filtered by location_source, including bible translation status. Uses materialized view language_coordinates_for_map for optimal performance. Uses && operator for efficient spatial index usage with coordinate range check for precision.';


COMMIT;

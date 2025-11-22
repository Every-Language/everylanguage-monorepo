-- 20251225000053_update_language_coordinates_for_map.sql
-- Update language_coordinates_for_map MV to use mv_language_stats instead of unified_bible_translation_stats
BEGIN;


-- Increase statement timeout for materialized view recreation (5 minutes)
SET
  local statement_timeout = '300s';


-- Drop existing materialized view if it exists (will be recreated)
DROP MATERIALIZED VIEW IF EXISTS language_coordinates_for_map cascade;


-- Recreate materialized view with mv_language_stats instead of unified_bible_translation_stats
CREATE MATERIALIZED VIEW language_coordinates_for_map AS
SELECT
  ler.language_entity_id,
  le.name AS language_name,
  ler.region_id,
  r.name AS region_name,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source,
  -- Bible translation status from mv_language_stats
  mls.has_full_audio_bible,
  mls.has_audio_portions,
  mls.has_portions AS has_text_portions,
  mls.bible_status,
  mls.has_jesus_film,
  mls.iso639_3,
  mls.rolv_code,
  mls.computed_at AS bible_stats_computed_at
FROM
  language_entities_regions ler
  INNER JOIN language_entities le ON ler.language_entity_id = le.id
  INNER JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_language_stats mls ON ler.language_entity_id = mls.language_entity_id
WHERE
  ler.location IS NOT NULL
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_language_coords_map_unique ON language_coordinates_for_map (language_entity_id, region_id);


-- Spatial index for efficient bbox queries
CREATE INDEX idx_language_coords_map_location ON language_coordinates_for_map USING gist (location);


-- Indexes for common filters and joins
CREATE INDEX idx_language_coords_map_language_id ON language_coordinates_for_map (language_entity_id);


CREATE INDEX idx_language_coords_map_region_id ON language_coordinates_for_map (region_id);


CREATE INDEX idx_language_coords_map_location_source ON language_coordinates_for_map (location_source)
WHERE
  location_source IS NOT NULL;


-- Update refresh function to call refresh_mv_language_stats() instead
CREATE OR REPLACE FUNCTION refresh_language_coordinates_map () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Refresh mv_language_stats first (if it exists)
  BEGIN
    PERFORM refresh_mv_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh mv_language_stats before refreshing language_coordinates_for_map: %', SQLERRM;
  END;
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_coordinates_for_map;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh language_coordinates_for_map: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON materialized view language_coordinates_for_map IS 'Pre-joined language coordinates data optimized for map rendering. Includes language names, region names, locations, bible translation status with bible_status and has_jesus_film from mv_language_stats. Refreshed automatically after mv_language_stats refreshes.';


comment ON function refresh_language_coordinates_map () IS 'Refreshes language_coordinates_for_map materialized view using CONCURRENTLY for non-blocking updates. Automatically refreshes mv_language_stats first. Includes timeout handling for large datasets.';


-- Update get_all_language_coordinates function to use the updated MV
DROP FUNCTION if EXISTS get_all_language_coordinates (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT
);


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
  -- Bible translation status fields from mv_language_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  bible_status INTEGER,
  has_jesus_film BOOLEAN,
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
    lcm.bible_status,
    lcm.has_jesus_film,
    lcm.iso639_3,
    lcm.rolv_code,
    lcm.bible_stats_computed_at
  FROM
    language_coordinates_for_map lcm
    CROSS JOIN bbox
  WHERE
    -- Spatial filtering using && operator (uses spatial index on language_coordinates_for_map.location)
    lcm.location && bbox.geom
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
) IS 'Returns language coordinate points filtered by bounding box (viewport), optionally filtered by location_source, including bible translation status with bible_status and has_jesus_film. Uses materialized view language_coordinates_for_map for optimal performance.';


-- Initial population of the materialized view
-- Must use non-concurrent refresh for initial population (required before CONCURRENTLY can be used)
REFRESH MATERIALIZED VIEW language_coordinates_for_map;


-- Reset statement timeout
RESET statement_timeout;


COMMIT;

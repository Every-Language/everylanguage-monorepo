-- 20251225000039_recreate_language_coordinates_map_view_with_bible_status.sql
-- Recreate language_coordinates_for_map materialized view with bible_status and has_jesus_film
-- Update get_all_language_coordinates to use the optimized view instead of direct JOINs
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


-- Drop existing materialized view if it exists (will be recreated)
DROP MATERIALIZED VIEW IF EXISTS language_coordinates_for_map cascade;


-- Recreate materialized view with all fields including bible_status and has_jesus_film
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
  -- Bible translation status from unified_bible_translation_stats
  ubs.has_full_audio_bible,
  ubs.has_audio_portions,
  ubs.has_text_portions,
  ubs.bible_status,
  ubs.has_jesus_film,
  ubs.iso639_3,
  ubs.rolv_code,
  ubs.computed_at AS bible_stats_computed_at
FROM
  language_entities_regions ler
  INNER JOIN language_entities le ON ler.language_entity_id = le.id
  INNER JOIN regions r ON ler.region_id = r.id
  LEFT JOIN unified_bible_translation_stats ubs ON ler.language_entity_id = ubs.language_entity_id
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


-- Recreate refresh function with CONCURRENTLY support and error handling
CREATE OR REPLACE FUNCTION refresh_language_coordinates_map () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the unique index idx_language_coords_map_unique which exists
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_coordinates_for_map;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    -- This allows sync functions to complete even if refresh times out
    RAISE WARNING 'Failed to refresh language_coordinates_for_map: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


-- Update get_all_language_coordinates function to use the materialized view
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
  -- Bible translation status fields from unified_bible_translation_stats
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


comment ON materialized view language_coordinates_for_map IS 'Pre-joined language coordinates data optimized for map rendering. Includes language names, region names, locations, bible translation status with bible_status and has_jesus_film. Refreshed automatically after unified_bible_translation_stats refreshes.';


comment ON function refresh_language_coordinates_map () IS 'Refreshes language_coordinates_for_map materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


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

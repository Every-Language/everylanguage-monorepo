-- Rename coordinate materialized views: language_coordinates_for_map -> language_coordinates, people_groups_coordinates_for_map -> people_groups_coordinates
-- Migration: 20251226000061_rename_coordinate_materialized_views.sql
-- Strategy: Update dependent functions first, then drop/recreate MVs
BEGIN;


-- Increase statement timeout for materialized view operations
SET
  local statement_timeout = '300s';


-- ============================================================================
-- STEP 1: Drop old coordinate MVs and create new ones
-- ============================================================================
-- Drop language_coordinates_for_map (functions will be updated after MVs exist)
DROP MATERIALIZED VIEW IF EXISTS language_coordinates_for_map cascade;


-- Create language_coordinates MV (exact copy of language_coordinates_for_map definition)
CREATE MATERIALIZED VIEW language_coordinates AS
SELECT
  ler.language_entity_id,
  le.name AS language_name,
  ler.region_id,
  r.name AS region_name,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source,
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
  LEFT JOIN language_stats mls ON ler.language_entity_id = mls.language_entity_id
WHERE
  ler.location IS NOT NULL
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


-- Create indexes on language_coordinates (update index names to match new MV name)
CREATE UNIQUE INDEX idx_language_coords_unique ON language_coordinates (language_entity_id, region_id);


CREATE INDEX idx_language_coords_location ON language_coordinates USING gist (location);


CREATE INDEX idx_language_coords_language_id ON language_coordinates (language_entity_id);


CREATE INDEX idx_language_coords_region_id ON language_coordinates (region_id);


CREATE INDEX idx_language_coords_location_source ON language_coordinates (location_source)
WHERE
  location_source IS NOT NULL;


comment ON materialized view language_coordinates IS 'Pre-joined language coordinates data optimized for map rendering. Includes language names, region names, locations, bible translation status with bible_status and has_jesus_film from language_stats. Refreshed automatically after language_stats refreshes.';


-- Drop people_groups_coordinates_for_map (functions will be updated after MVs exist)
DROP MATERIALIZED VIEW IF EXISTS people_groups_coordinates_for_map cascade;


-- Create people_groups_coordinates MV (exact copy of people_groups_coordinates_for_map definition)
CREATE MATERIALIZED VIEW people_groups_coordinates AS
SELECT
  pgr.people_group_id,
  pg.name AS people_group_name,
  pgr.region_id,
  r.name AS region_name,
  pgr.location_point,
  st_x (pgr.location_point) AS longitude,
  st_y (pgr.location_point) AS latitude,
  pgr.peop_name_in_country,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  mpg.computed_at AS stats_computed_at
FROM
  people_groups_regions pgr
  INNER JOIN people_groups pg ON pgr.people_group_id = pg.id
  INNER JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN people_groups_stats mpg ON pgr.people_group_id = mpg.people_group_id
WHERE
  pgr.location_point IS NOT NULL
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


-- Create indexes on people_groups_coordinates (update index names to match new MV name)
CREATE UNIQUE INDEX idx_people_groups_coords_unique ON people_groups_coordinates (people_group_id, region_id);


CREATE INDEX idx_people_groups_coords_location ON people_groups_coordinates USING gist (location_point);


CREATE INDEX idx_people_groups_coords_people_group_id ON people_groups_coordinates (people_group_id);


CREATE INDEX idx_people_groups_coords_region_id ON people_groups_coordinates (region_id);


comment ON materialized view people_groups_coordinates IS 'Pre-joined people group coordinates data optimized for map rendering. Includes people group names, region names, locations, and stats from people_groups_stats.';


-- ============================================================================
-- STEP 2: Update functions that depend on coordinate MVs
-- ============================================================================
-- get_all_language_coordinates(...) - Update to reference language_coordinates
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
  -- Bible translation status fields from language_stats
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
    language_coordinates lcm
    CROSS JOIN bbox
  WHERE
    -- Spatial filtering using && operator (uses spatial index on language_coordinates.location)
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
) IS 'Returns language coordinate points filtered by bounding box (viewport), optionally filtered by location_source, including bible translation status with bible_status and has_jesus_film. Uses materialized view language_coordinates for optimal performance.';


-- get_all_people_group_coordinates(...) - Update to reference people_groups_coordinates
CREATE OR REPLACE FUNCTION get_all_people_group_coordinates (
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 10000,
  p_location_source TEXT DEFAULT NULL
) returns TABLE (
  people_group_id UUID,
  people_group_name TEXT,
  region_id UUID,
  region_name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  peop_name_in_country TEXT,
  -- Stats from people_groups_stats
  population BIGINT,
  language_count INTEGER,
  country_count INTEGER,
  primary_language_rol3 TEXT,
  primary_language_name TEXT,
  primary_language_bible_status INTEGER,
  image_url TEXT,
  jpscale INTEGER,
  least_reached BOOLEAN,
  frontier BOOLEAN,
  primary_religion TEXT,
  percent_evangelical DOUBLE PRECISION,
  percent_christian_pc DOUBLE PRECISION,
  bible_status INTEGER,
  has_audio_recordings BOOLEAN,
  has_jesus_film BOOLEAN,
  stats_computed_at TIMESTAMPTZ
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
    pgcm.people_group_id,
    pgcm.people_group_name,
    pgcm.region_id,
    pgcm.region_name,
    pgcm.longitude,
    pgcm.latitude,
    pgcm.peop_name_in_country,
    -- Stats (pre-joined in materialized view)
    pgcm.population,
    pgcm.language_count,
    pgcm.country_count,
    pgcm.primary_language_rol3,
    pgcm.primary_language_name,
    pgcm.primary_language_bible_status,
    pgcm.image_url,
    pgcm.jpscale,
    pgcm.least_reached,
    pgcm.frontier,
    pgcm.primary_religion,
    pgcm.percent_evangelical,
    pgcm.percent_christian_pc,
    pgcm.bible_status,
    pgcm.has_audio_recordings,
    pgcm.has_jesus_film,
    pgcm.stats_computed_at
  FROM
    people_groups_coordinates pgcm
    CROSS JOIN bbox
  WHERE
    -- Spatial filtering using && operator (uses spatial index on people_groups_coordinates.location_point)
    pgcm.location_point && bbox.geom
  -- No ORDER BY for performance - not needed for map rendering
  -- PostgreSQL can use spatial index efficiently and apply LIMIT early
  LIMIT p_limit;
$$;


comment ON function get_all_people_group_coordinates (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT
) IS 'Returns all people group coordinates within a bounding box, including stats from people_groups_stats. Used for map rendering with spatial filtering.';


-- ============================================================================
-- STEP 2: Update refresh functions
-- ============================================================================
-- refresh_language_coordinates() (renamed from refresh_language_coordinates_map)
CREATE OR REPLACE FUNCTION refresh_language_coordinates () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Refresh language_stats first (if it exists)
  BEGIN
    PERFORM refresh_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_stats before refreshing language_coordinates: %', SQLERRM;
  END;
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_coordinates;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    RAISE WARNING 'Failed to refresh language_coordinates: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql security definer;


comment ON function refresh_language_coordinates () IS 'Refreshes language_coordinates materialized view using CONCURRENTLY for non-blocking updates. Automatically refreshes language_stats first. Includes timeout handling for large datasets.';


-- refresh_people_groups_coordinates() (renamed from refresh_people_groups_coordinates_map)
CREATE OR REPLACE FUNCTION refresh_people_groups_coordinates () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Refresh people_groups_stats first (if it exists)
  BEGIN
    PERFORM refresh_people_groups_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh people_groups_stats before refreshing people_groups_coordinates: %', SQLERRM;
  END;
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the unique index idx_people_groups_coords_unique which exists
  REFRESH MATERIALIZED VIEW CONCURRENTLY people_groups_coordinates;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    -- This allows sync functions to complete even if refresh times out
    RAISE WARNING 'Failed to refresh people_groups_coordinates: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql security definer;


comment ON function refresh_people_groups_coordinates () IS 'Refreshes people_groups_coordinates materialized view using CONCURRENTLY for non-blocking updates. Automatically refreshes people_groups_stats first. Includes timeout handling for large datasets.';


-- Update refresh_all_stats_mvs() to call new refresh function names
CREATE OR REPLACE FUNCTION refresh_all_stats_mvs () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes per MV (15 minutes total)
  PERFORM set_config('statement_timeout', '900000', TRUE);
  
  -- Refresh language_stats first (others depend on it)
  BEGIN
    PERFORM refresh_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh region_stats (depends on language_stats)
  BEGIN
    PERFORM refresh_region_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh region_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh people_groups_stats (depends on language_stats)
  BEGIN
    PERFORM refresh_people_groups_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh people_groups_stats: %', SQLERRM;
      -- Continue even if this one fails
  END;
  
  -- Also refresh language_coordinates (depends on language_stats)
  BEGIN
    PERFORM refresh_language_coordinates();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_coordinates: %', SQLERRM;
      -- Continue even if this one fails
  END;
END;
$$ language plpgsql security definer;


comment ON function refresh_all_stats_mvs () IS 'Refreshes all stats materialized views (language_stats, region_stats, people_groups_stats) and language_coordinates in sequence. Uses CONCURRENTLY for non-blocking updates. Includes error handling to continue on timeout or other errors.';


-- Reset statement timeout
RESET statement_timeout;


COMMIT;

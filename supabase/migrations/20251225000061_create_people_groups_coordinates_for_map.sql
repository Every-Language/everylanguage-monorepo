-- 20251225000061_create_people_groups_coordinates_for_map.sql
-- Create materialized view for people group coordinates optimized for map rendering
-- Pre-joins people_groups_regions with people_groups, regions, and mv_people_group_stats
-- Eliminates JOIN overhead at query time for significant performance improvement
BEGIN;


-- Increase statement timeout for materialized view creation (5 minutes)
SET
  local statement_timeout = '300s';


-- Create materialized view with pre-joined data
CREATE MATERIALIZED VIEW people_groups_coordinates_for_map AS
SELECT
  pgr.people_group_id,
  pg.name AS people_group_name,
  pgr.region_id,
  r.name AS region_name,
  pgr.location_point,
  st_x (pgr.location_point) AS longitude,
  st_y (pgr.location_point) AS latitude,
  pgr.peop_name_in_country,
  -- Stats from mv_people_group_stats
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
  LEFT JOIN mv_people_group_stats mpg ON pgr.people_group_id = mpg.people_group_id
WHERE
  pgr.location_point IS NOT NULL
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_people_groups_coords_map_unique ON people_groups_coordinates_for_map (people_group_id, region_id);


-- Spatial index for efficient bbox queries
CREATE INDEX idx_people_groups_coords_map_location ON people_groups_coordinates_for_map USING gist (location_point);


-- Indexes for common filters and joins
CREATE INDEX idx_people_groups_coords_map_people_group_id ON people_groups_coordinates_for_map (people_group_id);


CREATE INDEX idx_people_groups_coords_map_region_id ON people_groups_coordinates_for_map (region_id);


-- Create refresh function with CONCURRENTLY support and error handling
CREATE OR REPLACE FUNCTION refresh_people_groups_coordinates_map () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Refresh mv_people_group_stats first (if it exists)
  BEGIN
    PERFORM refresh_mv_people_group_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh mv_people_group_stats before refreshing people_groups_coordinates_for_map: %', SQLERRM;
  END;
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the unique index idx_people_groups_coords_map_unique which exists
  REFRESH MATERIALIZED VIEW CONCURRENTLY people_groups_coordinates_for_map;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    -- This allows sync functions to complete even if refresh times out
    RAISE WARNING 'Failed to refresh people_groups_coordinates_for_map: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON materialized view people_groups_coordinates_for_map IS 'Pre-joined people group coordinates data optimized for map rendering. Includes people group names, region names, locations, and stats from mv_people_group_stats. Refreshed automatically after mv_people_group_stats refreshes.';


comment ON function refresh_people_groups_coordinates_map () IS 'Refreshes people_groups_coordinates_for_map materialized view using CONCURRENTLY for non-blocking updates. Automatically refreshes mv_people_group_stats first. Includes timeout handling for large datasets.';


-- Create RPC function for fetching people group coordinates with bbox filtering
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
  -- Stats from mv_people_group_stats
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
    people_groups_coordinates_for_map pgcm
    CROSS JOIN bbox
  WHERE
    -- Spatial filtering using && operator (uses spatial index on people_groups_coordinates_for_map.location_point)
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
) IS 'Returns people group coordinate points filtered by bounding box (viewport), including stats from mv_people_group_stats. Uses materialized view people_groups_coordinates_for_map for optimal performance.';


-- Initial population of the materialized view
-- Must use non-concurrent refresh for initial population (required before CONCURRENTLY can be used)
REFRESH MATERIALIZED VIEW people_groups_coordinates_for_map;


-- Reset statement timeout
RESET statement_timeout;


COMMIT;

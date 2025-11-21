-- 20251225000025_create_language_coordinates_map_view.sql
-- Create materialized view for language coordinates optimized for map rendering
-- Pre-joins language_entities_regions with language_entities, regions, and unified_bible_translation_stats
-- Eliminates JOIN overhead at query time for significant performance improvement
BEGIN;


-- Create materialized view with pre-joined data
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


-- Create refresh function with CONCURRENTLY support and error handling
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


comment ON materialized view language_coordinates_for_map IS 'Pre-joined language coordinates data optimized for map rendering. Includes language names, region names, locations, and bible translation status. Refreshed automatically after unified_bible_translation_stats refreshes.';


comment ON function refresh_language_coordinates_map () IS 'Refreshes language_coordinates_for_map materialized view using CONCURRENTLY for non-blocking updates. Includes timeout handling for large datasets.';


-- Initial population of the materialized view
-- Must use non-concurrent refresh for initial population (required before CONCURRENTLY can be used)
REFRESH MATERIALIZED VIEW language_coordinates_for_map;


COMMIT;

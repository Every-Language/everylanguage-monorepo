-- 20251225000035_add_bible_status_to_language_coordinates_rpc.sql
-- Add bible_status and has_jesus_film to get_all_language_coordinates RPC function
BEGIN;


-- Drop existing function to recreate with new return fields
DROP FUNCTION if EXISTS get_all_language_coordinates (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT
);


-- Recreate function with bible_status and has_jesus_film fields
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
    ler.language_entity_id,
    le.name AS language_name,
    ler.region_id,
    r.name AS region_name,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status
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
    CROSS JOIN bbox
  WHERE
    ler.location IS NOT NULL
    -- Spatial filtering using && operator (uses spatial index on language_entities_regions.location)
    AND ler.location && bbox.geom
    AND ler.deleted_at IS NULL
    AND le.deleted_at IS NULL
    AND r.deleted_at IS NULL
    AND (
      p_location_source IS NULL
      OR ler.location_source = p_location_source
    )
  ORDER BY
    le.name ASC,
    r.name ASC
  LIMIT p_limit;
$$;


comment ON function get_all_language_coordinates (
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  TEXT
) IS 'Returns language coordinate points filtered by bounding box (viewport), optionally filtered by location_source, including bible translation status with bible_status and has_jesus_film. Uses PostGIS spatial index for efficient bbox filtering.';


COMMIT;

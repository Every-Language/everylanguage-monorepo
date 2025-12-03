-- 20251225000055_update_language_coordinates_rpcs.sql
-- Update get_language_coordinates and get_coordinates_by_region RPCs to use mv_language_stats
BEGIN;


-- Update get_language_coordinates function
DROP FUNCTION if EXISTS get_language_coordinates (UUID);


CREATE OR REPLACE FUNCTION get_language_coordinates (p_language_entity_id UUID) returns TABLE (
  language_entity_id UUID,
  region_id UUID,
  region_name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_source TEXT,
  -- Bible translation status fields from mv_language_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  iso639_3 TEXT,
  rolv_code TEXT,
  bible_stats_computed_at TIMESTAMPTZ
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    ler.language_entity_id,
    ler.region_id,
    r.name AS region_name,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status from mv_language_stats
    mls.has_full_audio_bible,
    mls.has_audio_portions,
    mls.has_portions AS has_text_portions,
    mls.iso639_3,
    mls.rolv_code,
    mls.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN regions r ON ler.region_id = r.id
    LEFT JOIN mv_language_stats mls ON ler.language_entity_id = mls.language_entity_id
  WHERE
    ler.language_entity_id = p_language_entity_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND r.deleted_at IS NULL
  ORDER BY
    r.name ASC;
$$;


comment ON function get_language_coordinates (UUID) IS 'Returns all coordinate points for a specific language_entity_id, including bible translation status from mv_language_stats.';


-- Update get_coordinates_by_region function
DROP FUNCTION if EXISTS get_coordinates_by_region (UUID);


CREATE OR REPLACE FUNCTION get_coordinates_by_region (p_region_id UUID) returns TABLE (
  language_entity_id UUID,
  language_name TEXT,
  region_id UUID,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_source TEXT,
  -- Bible translation status fields from mv_language_stats
  has_full_audio_bible BOOLEAN,
  has_audio_portions BOOLEAN,
  has_text_portions BOOLEAN,
  iso639_3 TEXT,
  rolv_code TEXT,
  bible_stats_computed_at TIMESTAMPTZ
) language sql stable security invoker
SET
  search_path = public AS $$
  SELECT
    ler.language_entity_id,
    le.name AS language_name,
    ler.region_id,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status from mv_language_stats
    mls.has_full_audio_bible,
    mls.has_audio_portions,
    mls.has_portions AS has_text_portions,
    mls.iso639_3,
    mls.rolv_code,
    mls.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN language_entities le ON ler.language_entity_id = le.id
    LEFT JOIN mv_language_stats mls ON ler.language_entity_id = mls.language_entity_id
  WHERE
    ler.region_id = p_region_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND le.deleted_at IS NULL
  ORDER BY
    le.name ASC;
$$;


comment ON function get_coordinates_by_region (UUID) IS 'Returns all language coordinate points for a specific region_id, including bible translation status from mv_language_stats.';


COMMIT;

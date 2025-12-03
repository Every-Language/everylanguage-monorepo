-- 20251225000014_create_get_language_coordinates_rpc.sql
-- Query helper RPC functions for language coordinates
-- Drop existing functions if they exist (to allow updating return types)
DROP FUNCTION if EXISTS get_language_coordinates (UUID);


DROP FUNCTION if EXISTS get_coordinates_by_region (UUID);


DROP FUNCTION if EXISTS get_all_language_coordinates (INTEGER, TEXT);


-- Get coordinates for a specific language_entity_id
CREATE OR REPLACE FUNCTION get_language_coordinates (p_language_entity_id UUID) returns TABLE (
  language_entity_id UUID,
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
  SELECT
    ler.language_entity_id,
    ler.region_id,
    r.name AS region_name,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status
    ubs.has_full_audio_bible,
    ubs.has_audio_portions,
    ubs.has_text_portions,
    ubs.iso639_3,
    ubs.rolv_code,
    ubs.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN regions r ON ler.region_id = r.id
    LEFT JOIN unified_bible_translation_stats ubs ON ler.language_entity_id = ubs.language_entity_id
  WHERE
    ler.language_entity_id = p_language_entity_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND r.deleted_at IS NULL
  ORDER BY
    r.name ASC;
$$;


comment ON function get_language_coordinates (UUID) IS 'Returns all coordinate points for a specific language_entity_id, including bible translation status.';


-- Get coordinates for a specific region_id
CREATE OR REPLACE FUNCTION get_coordinates_by_region (p_region_id UUID) returns TABLE (
  language_entity_id UUID,
  language_name TEXT,
  region_id UUID,
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
  SELECT
    ler.language_entity_id,
    le.name AS language_name,
    ler.region_id,
    ST_X(ler.location) AS longitude,
    ST_Y(ler.location) AS latitude,
    ler.location_source,
    -- Bible translation status
    ubs.has_full_audio_bible,
    ubs.has_audio_portions,
    ubs.has_text_portions,
    ubs.iso639_3,
    ubs.rolv_code,
    ubs.computed_at AS bible_stats_computed_at
  FROM
    language_entities_regions ler
    INNER JOIN language_entities le ON ler.language_entity_id = le.id
    LEFT JOIN unified_bible_translation_stats ubs ON ler.language_entity_id = ubs.language_entity_id
  WHERE
    ler.region_id = p_region_id
    AND ler.location IS NOT NULL
    AND ler.deleted_at IS NULL
    AND le.deleted_at IS NULL
  ORDER BY
    le.name ASC;
$$;


comment ON function get_coordinates_by_region (UUID) IS 'Returns all language coordinate points for a specific region_id, including bible translation status.';


-- Get all language coordinates globally
CREATE OR REPLACE FUNCTION get_all_language_coordinates (
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


comment ON function get_all_language_coordinates (INTEGER, TEXT) IS 'Returns all language coordinate points globally, optionally filtered by location_source, including bible translation status.';

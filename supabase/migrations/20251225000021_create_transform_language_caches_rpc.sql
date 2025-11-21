-- 20251225000021_create_transform_language_caches_rpc.sql
-- Transform jp_language_cache and grn_language_cache into language_entities system
-- Matches languages by ISO 639-3, creates sources, aliases, and region relationships
CREATE OR REPLACE FUNCTION transform_language_caches_to_entities () returns TABLE (
  jp_processed INTEGER,
  jp_entities_created INTEGER,
  jp_entities_matched INTEGER,
  jp_sources_created INTEGER,
  jp_aliases_created INTEGER,
  jp_regions_linked INTEGER,
  grn_processed INTEGER,
  grn_entities_created INTEGER,
  grn_entities_matched INTEGER,
  grn_sources_created INTEGER,
  grn_aliases_created INTEGER
) language plpgsql security definer
SET
  search_path = public AS $$
DECLARE
  v_jp_processed INTEGER := 0;
  v_jp_entities_created INTEGER := 0;
  v_jp_entities_matched INTEGER := 0;
  v_jp_sources_created INTEGER := 0;
  v_jp_aliases_created INTEGER := 0;
  v_jp_regions_linked INTEGER := 0;
  v_grn_processed INTEGER := 0;
  v_grn_entities_created INTEGER := 0;
  v_grn_entities_matched INTEGER := 0;
  v_grn_sources_created INTEGER := 0;
  v_grn_aliases_created INTEGER := 0;
  v_language_entity_id UUID;
  v_region_id UUID;
BEGIN
  -- ============================================================================
  -- STEP 1: PROCESS JP CACHE
  -- ============================================================================
  
  -- Count JP entries to process
  SELECT COUNT(*)
  INTO v_jp_processed
  FROM jp_language_cache
  WHERE iso639_3 IS NOT NULL
    AND TRIM(iso639_3) != '';

  -- Create temp table for JP processing
  CREATE TEMP TABLE IF NOT EXISTS jp_processing_temp (
    cache_id UUID,
    iso639_3 TEXT,
    language_name TEXT,
    country_code TEXT,
    existing_entity_id UUID,
    existing_name TEXT,
    jp_name_length INTEGER,
    existing_name_length INTEGER,
    language_entity_id UUID
  ) ON COMMIT DROP;

  -- Populate temp table
  INSERT INTO jp_processing_temp (
    cache_id, iso639_3, language_name, country_code,
    existing_entity_id, existing_name, jp_name_length, existing_name_length
  )
  SELECT DISTINCT
    jp.id,
    LOWER(TRIM(jp.iso639_3)),
    jp.language_name,
    jp.country_code,
    les.language_entity_id,
    le.name,
    LENGTH(jp.language_name),
    COALESCE(LENGTH(le.name), 0)
  FROM jp_language_cache jp
  LEFT JOIN language_entity_sources les 
    ON les.external_id = LOWER(TRIM(jp.iso639_3))
    AND les.external_id_type = 'iso-639-3'
    AND les.is_external = TRUE
    AND les.deleted_at IS NULL
  LEFT JOIN language_entities le ON le.id = les.language_entity_id
    AND le.deleted_at IS NULL
  WHERE jp.iso639_3 IS NOT NULL
    AND TRIM(jp.iso639_3) != '';

  -- Create new language entities for JP entries without matches
  WITH new_entities AS (
    INSERT INTO language_entities (name, level)
    SELECT DISTINCT language_name, 'language'::language_entity_level
    FROM jp_processing_temp
    WHERE existing_entity_id IS NULL
    RETURNING id, name
  )
  UPDATE jp_processing_temp jpt
  SET language_entity_id = ne.id
  FROM new_entities ne
  WHERE jpt.language_name = ne.name
    AND jpt.existing_entity_id IS NULL;

  -- Update existing entities with longer JP names and set language_entity_id
  UPDATE jp_processing_temp jpt
  SET language_entity_id = jpt.existing_entity_id
  WHERE jpt.existing_entity_id IS NOT NULL;

  UPDATE language_entities le
  SET name = jpt.language_name,
      updated_at = NOW()
  FROM jp_processing_temp jpt
  WHERE le.id = jpt.existing_entity_id
    AND jpt.jp_name_length > jpt.existing_name_length;

  -- Set language_entity_id for entries that didn't get it from new_entities
  UPDATE jp_processing_temp jpt
  SET language_entity_id = (
    SELECT id FROM language_entities le2 
    WHERE le2.name = jpt.language_name 
    AND le2.deleted_at IS NULL 
    LIMIT 1
  )
  WHERE jpt.language_entity_id IS NULL;

  -- Create language_entity_sources for JP
  INSERT INTO language_entity_sources (
    language_entity_id,
    source,
    external_id,
    external_id_type,
    is_external
  )
  SELECT DISTINCT
    jpt.language_entity_id,
    'joshua_project',
    jpt.iso639_3,
    'iso-639-3',
    TRUE
  FROM jp_processing_temp jpt
  WHERE jpt.language_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.language_entity_id = jpt.language_entity_id
        AND les.source = 'joshua_project'
        AND les.external_id = jpt.iso639_3
        AND les.external_id_type = 'iso-639-3'
        AND les.deleted_at IS NULL
    );

  -- Count JP sources created
  GET DIAGNOSTICS v_jp_sources_created = ROW_COUNT;

  -- Create language_aliases for JP
  INSERT INTO language_aliases (language_entity_id, alias_name)
  SELECT DISTINCT
    jpt.language_entity_id,
    jpt.language_name
  FROM jp_processing_temp jpt
  WHERE jpt.language_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM language_aliases la
      WHERE la.language_entity_id = jpt.language_entity_id
        AND LOWER(TRIM(la.alias_name)) = LOWER(TRIM(jpt.language_name))
        AND la.deleted_at IS NULL
    );

  -- Count JP aliases created
  GET DIAGNOSTICS v_jp_aliases_created = ROW_COUNT;

  -- Create language_entities_regions for JP
  INSERT INTO language_entities_regions (language_entity_id, region_id)
  SELECT DISTINCT
    jpt.language_entity_id,
    r.id
  FROM jp_processing_temp jpt
  CROSS JOIN LATERAL (
    SELECT r.id
    FROM regions r
    WHERE r.level = 'country'
      AND r.deleted_at IS NULL
      AND jpt.country_code IS NOT NULL
      AND TRIM(jpt.country_code) != ''
      AND (
        EXISTS (
          SELECT 1
          FROM region_sources rs
          WHERE rs.region_id = r.id
            AND rs.external_id = UPPER(TRIM(jpt.country_code))
            AND rs.external_id_type IN ('fips-10-4', 'fips', 'fips-10')
            AND rs.is_external = TRUE
            AND rs.deleted_at IS NULL
        )
        OR LOWER(TRIM(r.name)) = LOWER(TRIM(jpt.country_code))
        OR EXISTS (
          SELECT 1
          FROM region_aliases ra
          WHERE ra.region_id = r.id
            AND LOWER(TRIM(ra.alias_name)) = LOWER(TRIM(jpt.country_code))
            AND ra.deleted_at IS NULL
        )
      )
    LIMIT 1
  ) AS r
  WHERE jpt.language_entity_id IS NOT NULL
    AND r.id IS NOT NULL
  ON CONFLICT (language_entity_id, region_id) DO NOTHING;

  -- Count JP regions linked
  GET DIAGNOSTICS v_jp_regions_linked = ROW_COUNT;

  -- Count JP entities created/matched
  SELECT 
    COUNT(*) FILTER (WHERE existing_entity_id IS NULL),
    COUNT(*) FILTER (WHERE existing_entity_id IS NOT NULL)
  INTO v_jp_entities_created, v_jp_entities_matched
  FROM jp_processing_temp;

  -- ============================================================================
  -- STEP 2: PROCESS GRN CACHE
  -- ============================================================================
  
  -- Count GRN entries to process
  SELECT COUNT(*)
  INTO v_grn_processed
  FROM grn_language_cache
  WHERE iso639_3 IS NOT NULL
    AND TRIM(iso639_3) != '';

  -- Create temp table for GRN processing
  CREATE TEMP TABLE IF NOT EXISTS grn_processing_temp (
    cache_id UUID,
    grn_language_id INTEGER,
    iso639_3 TEXT,
    language_name TEXT,
    alternate_names JSONB,
    name_ietf TEXT,
    ietf TEXT,
    existing_entity_id UUID,
    existing_name TEXT,
    grn_name_length INTEGER,
    existing_name_length INTEGER,
    language_entity_id UUID
  ) ON COMMIT DROP;

  -- Populate temp table
  INSERT INTO grn_processing_temp (
    cache_id, grn_language_id, iso639_3, language_name,
    alternate_names, name_ietf, ietf,
    existing_entity_id, existing_name, grn_name_length, existing_name_length
  )
  SELECT DISTINCT
    grn.id,
    grn.grn_language_id,
    LOWER(TRIM(grn.iso639_3)),
    grn.language_name,
    grn.alternate_names,
    grn.name_ietf,
    grn.ietf,
    les.language_entity_id,
    le.name,
    LENGTH(grn.language_name),
    COALESCE(LENGTH(le.name), 0)
  FROM grn_language_cache grn
  LEFT JOIN language_entity_sources les 
    ON les.external_id = LOWER(TRIM(grn.iso639_3))
    AND les.external_id_type = 'iso-639-3'
    AND les.is_external = TRUE
    AND les.deleted_at IS NULL
  LEFT JOIN language_entities le ON le.id = les.language_entity_id
    AND le.deleted_at IS NULL
  WHERE grn.iso639_3 IS NOT NULL
    AND TRIM(grn.iso639_3) != '';

  -- Create new language entities for GRN entries without matches
  WITH new_entities AS (
    INSERT INTO language_entities (name, level)
    SELECT DISTINCT language_name, 'language'::language_entity_level
    FROM grn_processing_temp
    WHERE existing_entity_id IS NULL
    RETURNING id, name
  )
  UPDATE grn_processing_temp gpt
  SET language_entity_id = ne.id
  FROM new_entities ne
  WHERE gpt.language_name = ne.name
    AND gpt.existing_entity_id IS NULL;

  -- Update existing entities with longer GRN names and set language_entity_id
  UPDATE grn_processing_temp gpt
  SET language_entity_id = gpt.existing_entity_id
  WHERE gpt.existing_entity_id IS NOT NULL;

  UPDATE language_entities le
  SET name = gpt.language_name,
      updated_at = NOW()
  FROM grn_processing_temp gpt
  WHERE le.id = gpt.existing_entity_id
    AND gpt.grn_name_length > gpt.existing_name_length;

  -- Set language_entity_id for entries that didn't get it from new_entities
  UPDATE grn_processing_temp gpt
  SET language_entity_id = (
    SELECT id FROM language_entities le2 
    WHERE le2.name = gpt.language_name 
    AND le2.deleted_at IS NULL 
    LIMIT 1
  )
  WHERE gpt.language_entity_id IS NULL;

  -- Create language_entity_sources for GRN
  INSERT INTO language_entity_sources (
    language_entity_id,
    source,
    external_id,
    external_id_type,
    is_external
  )
  SELECT DISTINCT
    gpt.language_entity_id,
    'grn',
    gpt.grn_language_id::TEXT,
    'grn_language_id',
    TRUE
  FROM grn_processing_temp gpt
  WHERE gpt.language_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.language_entity_id = gpt.language_entity_id
        AND les.source = 'grn'
        AND les.external_id = gpt.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    );

  -- Count GRN sources created
  GET DIAGNOSTICS v_grn_sources_created = ROW_COUNT;

  -- Create language_aliases for GRN (from language_name, name_ietf, ietf, and alternate_names)
  INSERT INTO language_aliases (language_entity_id, alias_name)
  SELECT DISTINCT
    gpt.language_entity_id,
    alias_text
  FROM grn_processing_temp gpt
  CROSS JOIN LATERAL (
    SELECT gpt.language_name AS alias_text
    UNION ALL
    SELECT gpt.name_ietf WHERE gpt.name_ietf IS NOT NULL AND TRIM(gpt.name_ietf) != ''
    UNION ALL
    SELECT gpt.ietf WHERE gpt.ietf IS NOT NULL AND TRIM(gpt.ietf) != ''
    UNION ALL
    SELECT alt_name->>'name'
    FROM jsonb_array_elements(gpt.alternate_names) AS alt_name
    WHERE gpt.alternate_names IS NOT NULL
      AND alt_name->>'name' IS NOT NULL
      AND TRIM(alt_name->>'name') != ''
  ) AS alias_source
  WHERE gpt.language_entity_id IS NOT NULL
    AND alias_text IS NOT NULL
    AND TRIM(alias_text) != ''
    AND NOT EXISTS (
      SELECT 1
      FROM language_aliases la
      WHERE la.language_entity_id = gpt.language_entity_id
        AND LOWER(TRIM(la.alias_name)) = LOWER(TRIM(alias_text))
        AND la.deleted_at IS NULL
    );

  -- Count GRN aliases created
  GET DIAGNOSTICS v_grn_aliases_created = ROW_COUNT;

  -- Count GRN entities created/matched
  SELECT 
    COUNT(*) FILTER (WHERE existing_entity_id IS NULL),
    COUNT(*) FILTER (WHERE existing_entity_id IS NOT NULL)
  INTO v_grn_entities_created, v_grn_entities_matched
  FROM grn_processing_temp;

  -- Return statistics
  RETURN QUERY
  SELECT
    v_jp_processed,
    v_jp_entities_created,
    v_jp_entities_matched,
    v_jp_sources_created,
    v_jp_aliases_created,
    v_jp_regions_linked,
    v_grn_processed,
    v_grn_entities_created,
    v_grn_entities_matched,
    v_grn_sources_created,
    v_grn_aliases_created;
END;
$$;


comment ON function transform_language_caches_to_entities () IS 'Transforms jp_language_cache and grn_language_cache into language_entities system. Matches languages by ISO 639-3, creates sources, aliases, and region relationships. Uses longer language name when matching existing entities.';

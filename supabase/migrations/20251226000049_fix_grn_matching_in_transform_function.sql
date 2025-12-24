-- 20251226000049_fix_grn_matching_in_transform_function.sql
-- Fix GRN language matching in transform_language_caches_to_entities function
-- New matching algorithm: exact name → parent hierarchy → ISO code
-- Preserves GRN parent-child relationships and prevents dialect collapse
BEGIN;


-- Ensure pg_trgm extension is available for name similarity matching
CREATE EXTENSION if NOT EXISTS pg_trgm;


-- Replace the transform function with improved GRN matching logic
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
  v_parent_entity_id UUID;
BEGIN
  -- ============================================================================
  -- STEP 1: PROCESS JP CACHE (unchanged)
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
  -- STEP 2: PROCESS GRN CACHE (TWO-PHASE MATCHING LOGIC)
  -- ============================================================================
  -- 
  -- Two-Phase Algorithm (prevents dialect collapse):
  -- 
  -- PHASE 1: Process ALL parent languages (grn_parent_id IS NULL)
  --   1. Match by exact name (with existing GRN ID or just name)
  --   2. Match by ISO code (if name similarity >= 0.7)
  --   3. Create new parent entities for unmatched parents
  --   4. Create sources for all parents
  --   Result: All parent languages have language_entity_id set
  -- 
  -- PHASE 2: Process ALL dialects (grn_parent_id IS NOT NULL)
  --   1. Find parent entity ID (from temp table or database by GRN ID/ISO/name)
  --   2. Create missing parents if needed (edge case)
  --   3. Match dialect by exact name under parent
  --   4. Match dialect by similarity (> 0.8) under parent
  --   5. Create new dialects under parent
  --   6. Create sources for all dialects
  --   Result: All dialects linked to correct parent entities
  --
  -- This ensures parent-child relationships are preserved and prevents
  -- dialects from being created as standalone language entities.
  --
  
  -- Count GRN entries to process (only those with ISO codes)
  SELECT COUNT(*)
  INTO v_grn_processed
  FROM grn_language_cache
  WHERE iso639_3 IS NOT NULL
    AND TRIM(iso639_3) != '';

  -- Create temp table for GRN processing with parent_id tracking
  CREATE TEMP TABLE IF NOT EXISTS grn_processing_temp (
    cache_id UUID,
    grn_language_id INTEGER,
    grn_parent_id INTEGER,
    iso639_3 TEXT,
    language_name TEXT,
    alternate_names JSONB,
    name_ietf TEXT,
    ietf TEXT,
    has_iso BOOLEAN,
    -- Matching results
    exact_name_match_id UUID,
    iso_match_id UUID,
    parent_entity_id UUID,
    language_entity_id UUID,
    entity_level language_entity_level
  ) ON COMMIT DROP;

  -- Populate temp table with ALL GRN cache data (not just those with ISO)
  -- We need all entries for parent lookups even if parents lack ISO codes
  -- Use DISTINCT ON to ensure only one row per grn_language_id
  INSERT INTO grn_processing_temp (
    cache_id, grn_language_id, grn_parent_id, iso639_3, language_name,
    alternate_names, name_ietf, ietf, has_iso
  )
  SELECT DISTINCT ON (grn.grn_language_id)
    grn.id,
    grn.grn_language_id,
    grn.parent_id,
    LOWER(TRIM(grn.iso639_3)),
    grn.language_name,
    grn.alternate_names,
    grn.name_ietf,
    grn.ietf,
    (grn.iso639_3 IS NOT NULL AND TRIM(grn.iso639_3) != '')
  FROM grn_language_cache grn
  ORDER BY grn.grn_language_id, grn.id;

  -- ============================================================================
  -- PHASE 1: PROCESS ALL PARENT LANGUAGES (grn_parent_id IS NULL)
  -- ============================================================================
  -- Process parent languages completely before handling any dialects
  -- This ensures all parents have language_entity_id set before dialects need them
  
  -- Step 1a: Match parent languages by exact name with existing GRN ID
  UPDATE grn_processing_temp gpt
  SET exact_name_match_id = les.language_entity_id,
      language_entity_id = les.language_entity_id,
      entity_level = 'language'::language_entity_level
  FROM language_entity_sources les
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.source = 'grn'
    AND les.external_id = gpt.grn_language_id::TEXT
    AND les.external_id_type = 'grn_language_id'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
    AND le.parent_id IS NULL
    AND gpt.grn_parent_id IS NULL
    AND gpt.has_iso = TRUE
    AND gpt.language_entity_id IS NULL;

  -- Step 1b: Match parent languages by name (without existing GRN ID)
  UPDATE grn_processing_temp gpt
  SET exact_name_match_id = le.id,
      language_entity_id = le.id,
      entity_level = 'language'::language_entity_level
  FROM language_entities le
  WHERE le.deleted_at IS NULL
    AND le.parent_id IS NULL
    AND gpt.grn_parent_id IS NULL
    AND gpt.has_iso = TRUE
    AND LOWER(TRIM(le.name)) = LOWER(TRIM(gpt.language_name))
    AND gpt.language_entity_id IS NULL
    -- Don't match if entity already has a different GRN ID
    AND NOT EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.language_entity_id = le.id
        AND les.source = 'grn'
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
        AND les.external_id != gpt.grn_language_id::TEXT
    );

  -- Step 1c: Match parent languages by ISO code
  UPDATE grn_processing_temp gpt
  SET iso_match_id = les.language_entity_id
  FROM language_entity_sources les
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.external_id = gpt.iso639_3
    AND les.external_id_type = 'iso-639-3'
    AND les.is_external = TRUE
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
    AND gpt.grn_parent_id IS NULL
    AND gpt.has_iso = TRUE
    AND gpt.language_entity_id IS NULL;

  -- Step 1d: Use ISO match if name similarity is acceptable (>= 0.7)
  UPDATE grn_processing_temp gpt
  SET language_entity_id = gpt.iso_match_id,
      entity_level = 'language'::language_entity_level
  FROM language_entities le
  WHERE le.id = gpt.iso_match_id
    AND similarity(LOWER(TRIM(gpt.language_name)), LOWER(TRIM(le.name))) >= 0.7
    AND gpt.grn_parent_id IS NULL
    AND gpt.has_iso = TRUE
    AND gpt.language_entity_id IS NULL;

  -- Step 1e: Create new parent entities for unmatched parents
  WITH new_parents AS (
    INSERT INTO language_entities (name, level)
    SELECT DISTINCT 
      gpt.language_name,
      'language'::language_entity_level
    FROM grn_processing_temp gpt
    WHERE gpt.grn_parent_id IS NULL
      AND gpt.has_iso = TRUE
      AND gpt.language_entity_id IS NULL
    RETURNING id, name
  ),
  parent_matches AS (
    SELECT DISTINCT ON (gpt.grn_language_id)
      gpt.grn_language_id,
      np.id as entity_id
    FROM grn_processing_temp gpt
    JOIN new_parents np 
      ON LOWER(TRIM(np.name)) = LOWER(TRIM(gpt.language_name))
    WHERE gpt.grn_parent_id IS NULL
      AND gpt.has_iso = TRUE
      AND gpt.language_entity_id IS NULL
  )
  UPDATE grn_processing_temp gpt
  SET language_entity_id = pm.entity_id,
      entity_level = 'language'::language_entity_level
  FROM parent_matches pm
  WHERE gpt.grn_language_id = pm.grn_language_id;

  -- Step 1f: Create sources for ALL parent entities (with deduplication)
  INSERT INTO language_entity_sources (
    language_entity_id,
    source,
    external_id,
    external_id_type,
    is_external
  )
  SELECT DISTINCT ON (gpt.grn_language_id)
    gpt.language_entity_id,
    'grn',
    gpt.grn_language_id::TEXT,
    'grn_language_id',
    TRUE
  FROM grn_processing_temp gpt
  WHERE gpt.grn_parent_id IS NULL
    AND gpt.has_iso = TRUE
    AND gpt.language_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.source = 'grn'
        AND les.external_id = gpt.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    )
  ORDER BY gpt.grn_language_id, gpt.language_entity_id;

  -- ============================================================================
  -- PHASE 2: PROCESS ALL DIALECTS (grn_parent_id IS NOT NULL)
  -- ============================================================================
  -- All parent languages now have language_entity_id set
  -- Dialects can safely reference their parents
  
  -- Step 2a: Find parent entity ID from temp table (parent processed in Phase 1 or exists in DB)
  -- NOTE: Parents without ISO codes are in temp table but weren't processed in Phase 1
  UPDATE grn_processing_temp gpt_dialect
  SET parent_entity_id = gpt_parent.language_entity_id
  FROM grn_processing_temp gpt_parent
  WHERE gpt_parent.grn_language_id = gpt_dialect.grn_parent_id
    AND gpt_parent.language_entity_id IS NOT NULL
    AND gpt_dialect.grn_parent_id IS NOT NULL
    AND gpt_dialect.has_iso = TRUE
    AND gpt_dialect.parent_entity_id IS NULL;

  -- Step 2b: If parent not in temp table, find by GRN ID in database
  UPDATE grn_processing_temp gpt
  SET parent_entity_id = les.language_entity_id
  FROM language_entity_sources les
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.external_id = gpt.grn_parent_id::TEXT
    AND les.external_id_type = 'grn_language_id'
    AND les.source = 'grn'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
    AND gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NULL;

  -- Step 2c: If parent still not found, try ISO code match
  UPDATE grn_processing_temp gpt
  SET parent_entity_id = les.language_entity_id
  FROM grn_language_cache parent_grn
  JOIN language_entity_sources les 
    ON les.external_id = LOWER(TRIM(parent_grn.iso639_3))
    AND les.external_id_type = 'iso-639-3'
    AND les.is_external = TRUE
    AND les.deleted_at IS NULL
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE parent_grn.grn_language_id = gpt.grn_parent_id
    AND parent_grn.iso639_3 IS NOT NULL
    AND TRIM(parent_grn.iso639_3) != ''
    AND le.deleted_at IS NULL
    AND gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NULL;

  -- Step 2d: If parent still not found, try name match
  UPDATE grn_processing_temp gpt
  SET parent_entity_id = le.id
  FROM grn_language_cache parent_grn
  JOIN language_entities le 
    ON LOWER(TRIM(le.name)) = LOWER(TRIM(parent_grn.language_name))
  WHERE parent_grn.grn_language_id = gpt.grn_parent_id
    AND le.deleted_at IS NULL
    AND le.parent_id IS NULL  -- Ensure we match to parent entities only
    AND gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NULL;

  -- Step 2e: Create missing parent entities (including parents without ISO codes)
  -- This handles parents that weren't processed in Phase 1 due to lack of ISO codes
  WITH missing_parents AS (
    SELECT DISTINCT
      parent_grn.grn_language_id,
      parent_grn.language_name
    FROM grn_processing_temp gpt
    JOIN grn_language_cache parent_grn ON parent_grn.grn_language_id = gpt.grn_parent_id
    WHERE gpt.grn_parent_id IS NOT NULL
      AND gpt.has_iso = TRUE
      AND gpt.parent_entity_id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM language_entity_sources les
        WHERE les.external_id = parent_grn.grn_language_id::TEXT
          AND les.external_id_type = 'grn_language_id'
          AND les.deleted_at IS NULL
      )
  ),
  new_parents AS (
    INSERT INTO language_entities (name, level)
    SELECT DISTINCT 
      mp.language_name,
      'language'::language_entity_level
    FROM missing_parents mp
    RETURNING id, name
  ),
  parent_sources AS (
    INSERT INTO language_entity_sources (language_entity_id, source, external_id, external_id_type, is_external)
    SELECT DISTINCT
      np.id,
      'grn',
      mp.grn_language_id::TEXT,
      'grn_language_id',
      TRUE
    FROM missing_parents mp
    JOIN new_parents np ON LOWER(TRIM(np.name)) = LOWER(TRIM(mp.language_name))
    RETURNING language_entity_id, external_id
  )
  UPDATE grn_processing_temp gpt
  SET parent_entity_id = ps.language_entity_id
  FROM parent_sources ps
  WHERE ps.external_id = gpt.grn_parent_id::TEXT
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NULL;
  
  -- Update temp table entries for newly created parents
  UPDATE grn_processing_temp gpt_parent
  SET language_entity_id = les.language_entity_id
  FROM language_entity_sources les
  WHERE les.external_id = gpt_parent.grn_language_id::TEXT
    AND les.external_id_type = 'grn_language_id'
    AND les.source = 'grn'
    AND les.deleted_at IS NULL
    AND gpt_parent.language_entity_id IS NULL;

  -- Step 2f: Match dialects by exact name under correct parent
  UPDATE grn_processing_temp gpt
  SET language_entity_id = le.id,
      entity_level = 'dialect'::language_entity_level
  FROM language_entities le
  WHERE le.parent_id = gpt.parent_entity_id
    AND le.deleted_at IS NULL
    AND LOWER(TRIM(le.name)) = LOWER(TRIM(gpt.language_name))
    AND gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NOT NULL
    AND gpt.language_entity_id IS NULL;

  -- Step 2g: Match dialects by similarity (>0.8) under correct parent
  UPDATE grn_processing_temp gpt
  SET language_entity_id = le.id,
      entity_level = 'dialect'::language_entity_level
  FROM language_entities le
  WHERE le.parent_id = gpt.parent_entity_id
    AND le.deleted_at IS NULL
    AND similarity(LOWER(TRIM(le.name)), LOWER(TRIM(gpt.language_name))) > 0.8
    AND gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.parent_entity_id IS NOT NULL
    AND gpt.language_entity_id IS NULL
    -- Only take the best match (highest similarity)
    AND NOT EXISTS (
      SELECT 1
      FROM language_entities le2
      WHERE le2.parent_id = gpt.parent_entity_id
        AND le2.deleted_at IS NULL
        AND similarity(LOWER(TRIM(le2.name)), LOWER(TRIM(gpt.language_name))) > 
            similarity(LOWER(TRIM(le.name)), LOWER(TRIM(gpt.language_name)))
    );

  -- Step 2h: Create new dialect entities under parents
  WITH new_dialects AS (
    INSERT INTO language_entities (name, level, parent_id)
    SELECT DISTINCT
      gpt.language_name,
      'dialect'::language_entity_level,
      gpt.parent_entity_id
    FROM grn_processing_temp gpt
    WHERE gpt.grn_parent_id IS NOT NULL
      AND gpt.has_iso = TRUE
      AND gpt.parent_entity_id IS NOT NULL
      AND gpt.language_entity_id IS NULL
    RETURNING id, name, parent_id
  ),
  dialect_matches AS (
    SELECT DISTINCT ON (gpt.grn_language_id)
      gpt.grn_language_id,
      nd.id as entity_id
    FROM grn_processing_temp gpt
    JOIN new_dialects nd 
      ON LOWER(TRIM(nd.name)) = LOWER(TRIM(gpt.language_name))
      AND nd.parent_id = gpt.parent_entity_id
    WHERE gpt.grn_parent_id IS NOT NULL
      AND gpt.has_iso = TRUE
      AND gpt.language_entity_id IS NULL
  )
  UPDATE grn_processing_temp gpt
  SET language_entity_id = dm.entity_id,
      entity_level = 'dialect'::language_entity_level
  FROM dialect_matches dm
  WHERE gpt.grn_language_id = dm.grn_language_id;

  -- Step 2i: Create sources for ALL dialect entities (with deduplication)
  INSERT INTO language_entity_sources (
    language_entity_id,
    source,
    external_id,
    external_id_type,
    is_external
  )
  SELECT DISTINCT ON (gpt.grn_language_id)
    gpt.language_entity_id,
    'grn',
    gpt.grn_language_id::TEXT,
    'grn_language_id',
    TRUE
  FROM grn_processing_temp gpt
  WHERE gpt.grn_parent_id IS NOT NULL
    AND gpt.has_iso = TRUE
    AND gpt.language_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.source = 'grn'
        AND les.external_id = gpt.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    )
  ORDER BY gpt.grn_language_id, gpt.language_entity_id;

  -- Count total GRN sources created (both parents and dialects)
  SELECT COUNT(DISTINCT gpt.grn_language_id)
  INTO v_grn_sources_created
  FROM grn_processing_temp gpt
  WHERE gpt.language_entity_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM language_entity_sources les
      WHERE les.language_entity_id = gpt.language_entity_id
        AND les.source = 'grn'
        AND les.external_id = gpt.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    );

  -- ============================================================================
  -- CREATE LANGUAGE_ALIASES FOR GRN
  -- ============================================================================
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

  -- ============================================================================
  -- COUNT GRN ENTITIES CREATED/MATCHED
  -- ============================================================================
  SELECT 
    COUNT(*) FILTER (WHERE exact_name_match_id IS NULL AND iso_match_id IS NULL AND parent_entity_id IS NULL),
    COUNT(*) FILTER (WHERE exact_name_match_id IS NOT NULL OR iso_match_id IS NOT NULL OR parent_entity_id IS NOT NULL)
  INTO v_grn_entities_created, v_grn_entities_matched
  FROM grn_processing_temp
  WHERE language_entity_id IS NOT NULL;

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


-- Update function comment
comment ON function transform_language_caches_to_entities () IS 'Transforms jp_language_cache and grn_language_cache into language_entities system. JP matching: by ISO 639-3. GRN matching: two-phase approach (Phase 1: all parents, Phase 2: all dialects) with exact name → ISO → new entity. Preserves GRN parent-child relationships and prevents dialect collapse. Uses pg_trgm similarity (>0.8) for dialect matching.';


COMMIT;

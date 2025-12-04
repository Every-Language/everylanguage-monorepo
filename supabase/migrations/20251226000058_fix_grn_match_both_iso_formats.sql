-- 20251226000058_fix_grn_match_both_iso_formats.sql
-- Fix GRN matching to check BOTH ISO external_id_type formats:
-- - 'iso-639-3' (with dashes, from SIL seed data - 15,057 sources)
-- - 'iso639_3' (with underscores, from JP - 7,241 sources)
-- This prevents creating duplicates of entities that already exist from SIL seed data.
BEGIN;


-- Drop existing function first
DROP FUNCTION if EXISTS transform_language_caches_to_entities ();


-- Create the transform function with corrected ISO format matching logic
CREATE FUNCTION transform_language_caches_to_entities () returns TABLE (
  jp_matched INTEGER,
  jp_created INTEGER,
  grn_matched INTEGER,
  grn_created INTEGER
) language plpgsql AS $$
DECLARE
  v_jp_matched INTEGER := 0;
  v_jp_created INTEGER := 0;
  v_grn_matched INTEGER := 0;
  v_grn_created INTEGER := 0;
BEGIN
  
  -- ============================================================================
  -- PART 1: PROCESS JOSHUA PROJECT LANGUAGES
  -- ============================================================================
  -- Match by name only (JP doesn't have parent-child relationships)
  
  -- Step 1: Match existing entities by name (JP uses ISO 639-3 as unique key)
  INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
  SELECT DISTINCT ON (jp.iso639_3)
    le.id,
    'jp',
    NULL,
    TRUE,
    jp.iso639_3,
    'iso639_3'
  FROM jp_language_cache jp
  JOIN language_entities le ON LOWER(le.name) = LOWER(jp.language_name)
  WHERE le.level = 'language'::language_entity_level
    AND le.parent_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM language_entity_sources les
      WHERE les.language_entity_id = le.id
        AND les.source = 'jp'
        AND les.external_id = jp.iso639_3
        AND les.external_id_type = 'iso639_3'
        AND les.deleted_at IS NULL
    );
  
  GET DIAGNOSTICS v_jp_matched = ROW_COUNT;
  
  -- Step 2: Create new entities for unmatched JP entries
  WITH new_entities AS (
    INSERT INTO language_entities (name, level, parent_id)
    SELECT DISTINCT
      jp.language_name,
      'language'::language_entity_level,
      NULL::uuid
    FROM jp_language_cache jp
    WHERE NOT EXISTS (
      SELECT 1 FROM language_entities le
      WHERE LOWER(le.name) = LOWER(jp.language_name)
        AND le.level = 'language'::language_entity_level
        AND le.parent_id IS NULL
    )
    RETURNING id, name
  ),
  new_sources AS (
    INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
    SELECT DISTINCT ON (jp.iso639_3)
      ne.id,
      'jp',
      NULL,
      TRUE,
      jp.iso639_3,
      'iso639_3'
    FROM jp_language_cache jp
    JOIN new_entities ne ON LOWER(ne.name) = LOWER(jp.language_name)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_jp_created FROM new_sources;
  
  -- ============================================================================
  -- PART 2: PROCESS GRN LANGUAGES (ISO-BASED MATCHING)
  -- ============================================================================
  -- Strategy: Use ISO code as primary identifier since GRN children inherit parent ISO
  -- This prevents merging different languages that happen to have the same name
  -- (e.g., "Kalagan: East" with ISO kge vs kqe are DIFFERENT languages)
  
  -- PHASE 1: Process all parent languages (parent_id = NULL in GRN cache)
  
  -- Step 1: Match GRN parents to ANY existing entity with matching ISO code
  -- Check BOTH 'iso-639-3' (SIL format) AND 'iso639_3' (JP format)
  INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
  SELECT DISTINCT ON (grn.grn_language_id)
    les_iso.language_entity_id,
    'grn',
    NULL,
    TRUE,
    grn.grn_language_id::TEXT,
    'grn_language_id'
  FROM grn_language_cache grn
  -- Match to ANY existing source with this ISO code (both formats)
  JOIN language_entity_sources les_iso ON les_iso.external_id = grn.iso639_3
    AND les_iso.external_id_type IN ('iso639_3', 'iso-639-3')  -- Check BOTH formats!
    AND les_iso.deleted_at IS NULL
  WHERE grn.parent_id IS NULL
    AND grn.iso639_3 IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM language_entity_sources les
      WHERE les.external_id = grn.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    )
  ORDER BY grn.grn_language_id, les_iso.language_entity_id;
  
  GET DIAGNOSTICS v_grn_matched = ROW_COUNT;
  
  -- Step 2: Create new parent entities for GRN parents not matched by ISO
  -- (either no ISO, or ISO not found in existing entities)
  WITH new_parents AS (
    INSERT INTO language_entities (name, level, parent_id)
    SELECT DISTINCT ON (grn.grn_language_id)
      grn.language_name,
      'language'::language_entity_level,
      NULL::uuid
    FROM grn_language_cache grn
    WHERE grn.parent_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM language_entity_sources les
        WHERE les.external_id = grn.grn_language_id::TEXT
          AND les.external_id_type = 'grn_language_id'
          AND les.deleted_at IS NULL
      )
    ORDER BY grn.grn_language_id
    RETURNING id, name
  ),
  new_sources AS (
    INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
    SELECT DISTINCT ON (grn.grn_language_id)
      np.id,
      'grn',
      NULL,
      TRUE,
      grn.grn_language_id::TEXT,
      'grn_language_id'
    FROM grn_language_cache grn
    JOIN new_parents np ON LOWER(np.name) = LOWER(grn.language_name)
    WHERE grn.parent_id IS NULL
    ORDER BY grn.grn_language_id, np.id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_grn_created FROM new_sources;
  
  -- PHASE 2: Process all child languages (parent_id IS NOT NULL in GRN cache)
  -- Key: Match by parent's GRN ID + child's ISO + child's name to prevent merging different languages
  
  -- Step 1: Match dialects where parent exists and ISO+name match
  -- This ensures "Kalagan: East" (ISO kge) doesn't match "Kalagan: East" (ISO kqe)
  INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
  SELECT DISTINCT ON (grn_child.grn_language_id)
    le_child.id,
    'grn',
    NULL,
    TRUE,
    grn_child.grn_language_id::TEXT,
    'grn_language_id'
  FROM grn_language_cache grn_child
  -- Find the parent entity via its GRN source
  JOIN language_entity_sources les_parent ON les_parent.external_id = grn_child.parent_id::TEXT
    AND les_parent.external_id_type = 'grn_language_id'
    AND les_parent.deleted_at IS NULL
  JOIN language_entities le_parent ON les_parent.language_entity_id = le_parent.id
  -- Match child by: correct parent + matching ISO (inherited from parent) + matching name
  JOIN grn_language_cache grn_parent ON grn_parent.grn_language_id = grn_child.parent_id
  JOIN language_entities le_child ON le_child.parent_id = le_parent.id
    AND LOWER(le_child.name) = LOWER(grn_child.language_name)
  WHERE grn_child.parent_id IS NOT NULL
    -- Verify ISO codes match (child inherits parent's ISO in GRN)
    AND grn_child.iso639_3 = grn_parent.iso639_3
    AND le_child.level = 'dialect'::language_entity_level
    AND NOT EXISTS (
      SELECT 1 FROM language_entity_sources les
      WHERE les.language_entity_id = le_child.id
        AND les.external_id = grn_child.grn_language_id::TEXT
        AND les.external_id_type = 'grn_language_id'
        AND les.deleted_at IS NULL
    )
  ORDER BY grn_child.grn_language_id, le_child.id;
  
  GET DIAGNOSTICS v_grn_created = ROW_COUNT;
  v_grn_matched := v_grn_matched + v_grn_created;
  
  -- Step 2: Create new dialect entities for unmatched children
  WITH new_dialects AS (
    INSERT INTO language_entities (name, level, parent_id)
    SELECT DISTINCT ON (grn_child.grn_language_id)
      grn_child.language_name,
      'dialect'::language_entity_level,
      le_parent.id
    FROM grn_language_cache grn_child
    JOIN language_entity_sources les_parent ON les_parent.external_id = grn_child.parent_id::TEXT
      AND les_parent.external_id_type = 'grn_language_id'
      AND les_parent.deleted_at IS NULL
    JOIN language_entities le_parent ON les_parent.language_entity_id = le_parent.id
    WHERE grn_child.parent_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM language_entity_sources les
        WHERE les.external_id = grn_child.grn_language_id::TEXT
          AND les.external_id_type = 'grn_language_id'
          AND les.deleted_at IS NULL
      )
    ORDER BY grn_child.grn_language_id
    RETURNING id, name, parent_id
  ),
  new_sources AS (
    INSERT INTO language_entity_sources (language_entity_id, source, version, is_external, external_id, external_id_type)
    SELECT DISTINCT ON (grn_child.grn_language_id)
      nd.id,
      'grn',
      NULL,
      TRUE,
      grn_child.grn_language_id::TEXT,
      'grn_language_id'
    FROM grn_language_cache grn_child
    JOIN language_entity_sources les_parent ON les_parent.external_id = grn_child.parent_id::TEXT
      AND les_parent.external_id_type = 'grn_language_id'
      AND les_parent.deleted_at IS NULL
    JOIN new_dialects nd ON nd.parent_id = les_parent.language_entity_id
      AND LOWER(nd.name) = LOWER(grn_child.language_name)
    WHERE grn_child.parent_id IS NOT NULL
    ORDER BY grn_child.grn_language_id, nd.id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_grn_created FROM new_sources;
  
  -- Return summary
  RETURN QUERY
  SELECT v_jp_matched, v_jp_created, v_grn_matched, v_grn_created;
  
END;
$$;


comment ON function transform_language_caches_to_entities () IS 'ISO-based transform supporting BOTH iso-639-3 (SIL) and iso639_3 (JP) formats. JP: matches by name. GRN Phase 1: parents match to ANY existing entity with matching ISO (checks both formats) or create new. GRN Phase 2: children match by parent GRN ID + ISO verification + name. Prevents duplicates like "Abipon" (already exists from SIL seed).';


COMMIT;

-- 20251226000050_validate_grn_matching.sql
-- Validation queries to check GRN language matching quality
-- Run these after transform_language_caches_to_entities() to verify correctness
BEGIN;


-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================
-- 1. Check for duplicate GRN IDs (each GRN language ID should map to exactly one entity)
CREATE OR REPLACE FUNCTION validate_grn_matching_duplicate_ids () returns TABLE (
  grn_language_id TEXT,
  entity_count BIGINT,
  entity_ids UUID[],
  entity_names TEXT[]
) language plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    les.external_id as grn_language_id,
    COUNT(*)::BIGINT as entity_count,
    ARRAY_AGG(DISTINCT les.language_entity_id) as entity_ids,
    ARRAY_AGG(DISTINCT le.name) as entity_names
  FROM language_entity_sources les
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.source = 'grn'
    AND les.external_id_type = 'grn_language_id'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
  GROUP BY les.external_id
  HAVING COUNT(*) > 1;
END;
$$;


-- 2. Check for entities with multiple GRN IDs that have different names
CREATE OR REPLACE FUNCTION validate_grn_matching_name_consistency () returns TABLE (
  language_entity_id UUID,
  entity_name TEXT,
  grn_id_count BIGINT,
  grn_names TEXT[]
) language plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    les.language_entity_id,
    le.name as entity_name,
    COUNT(*)::BIGINT as grn_id_count,
    ARRAY_AGG(DISTINCT grn.language_name ORDER BY grn.language_name) as grn_names
  FROM language_entity_sources les
  JOIN language_entities le ON le.id = les.language_entity_id
  JOIN grn_language_cache grn ON grn.grn_language_id::TEXT = les.external_id
  WHERE les.source = 'grn'
    AND les.external_id_type = 'grn_language_id'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
  GROUP BY les.language_entity_id, le.name
  HAVING COUNT(*) > 1 
    AND COUNT(DISTINCT grn.language_name) > 1;
END;
$$;


-- 3. Check parent-child relationships are preserved
CREATE OR REPLACE FUNCTION validate_grn_matching_parent_child () returns TABLE (
  grn_language_id INTEGER,
  grn_name TEXT,
  grn_parent_id INTEGER,
  entity_id UUID,
  entity_name TEXT,
  entity_parent_id UUID,
  parent_grn_id_matches BOOLEAN
) language plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    grn.grn_language_id,
    grn.language_name as grn_name,
    grn.parent_id as grn_parent_id,
    le.id as entity_id,
    le.name as entity_name,
    le.parent_id as entity_parent_id,
    EXISTS (
      SELECT 1
      FROM language_entity_sources les2
      WHERE les2.language_entity_id = le.parent_id
        AND les2.external_id = grn.parent_id::TEXT
        AND les2.external_id_type = 'grn_language_id'
        AND les2.deleted_at IS NULL
    ) as parent_grn_id_matches
  FROM grn_language_cache grn
  JOIN language_entity_sources les 
    ON les.external_id = grn.grn_language_id::TEXT
    AND les.external_id_type = 'grn_language_id'
    AND les.deleted_at IS NULL
  JOIN language_entities le ON le.id = les.language_entity_id
  WHERE grn.parent_id IS NOT NULL
    AND le.deleted_at IS NULL
    AND (
      -- Entity has no parent when GRN says it should
      le.parent_id IS NULL
      -- Or parent doesn't match GRN parent ID
      OR NOT EXISTS (
        SELECT 1
        FROM language_entity_sources les2
        WHERE les2.language_entity_id = le.parent_id
          AND les2.external_id = grn.parent_id::TEXT
          AND les2.external_id_type = 'grn_language_id'
          AND les2.deleted_at IS NULL
      )
    );
END;
$$;


-- 4. Check ISO code consistency (entities sharing ISO codes should be related)
CREATE OR REPLACE FUNCTION validate_grn_matching_iso_consistency () returns TABLE (
  iso639_3 TEXT,
  entity_count BIGINT,
  entity_ids UUID[],
  entity_names TEXT[],
  are_related BOOLEAN
) language plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH iso_groups AS (
    SELECT 
      grn.iso639_3,
      ARRAY_AGG(DISTINCT les.language_entity_id) as entity_ids,
      ARRAY_AGG(DISTINCT le.name) as entity_names
    FROM grn_language_cache grn
    JOIN language_entity_sources les 
      ON les.external_id = grn.grn_language_id::TEXT
      AND les.external_id_type = 'grn_language_id'
      AND les.deleted_at IS NULL
    JOIN language_entities le ON le.id = les.language_entity_id
    WHERE grn.iso639_3 IS NOT NULL
      AND le.deleted_at IS NULL
    GROUP BY grn.iso639_3
    HAVING COUNT(DISTINCT les.language_entity_id) > 1
  )
  SELECT 
    ig.iso639_3,
    array_length(ig.entity_ids, 1)::BIGINT as entity_count,
    ig.entity_ids,
    ig.entity_names,
    -- Check if entities are related (parent-child or siblings)
    EXISTS (
      SELECT 1
      FROM language_entities le1
      JOIN language_entities le2 ON le2.id = ANY(ig.entity_ids)
      WHERE le1.id = ANY(ig.entity_ids)
        AND (
          le1.parent_id = le2.id
          OR le2.parent_id = le1.id
          OR (le1.parent_id IS NOT NULL AND le1.parent_id = le2.parent_id)
        )
    ) as are_related
  FROM iso_groups ig;
END;
$$;


-- 5. Check coverage (all GRN cache entries with ISO codes should have sources)
CREATE OR REPLACE FUNCTION validate_grn_matching_coverage () returns TABLE (
  total_grn_entries BIGINT,
  entries_with_sources BIGINT,
  entries_without_sources BIGINT,
  missing_grn_ids INTEGER[]
) language plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH coverage_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total,
      COUNT(les.id)::BIGINT as with_sources,
      COUNT(*) FILTER (WHERE les.id IS NULL)::BIGINT as without_sources,
      ARRAY_AGG(grn.grn_language_id) FILTER (WHERE les.id IS NULL) as missing_ids
    FROM grn_language_cache grn
    LEFT JOIN language_entity_sources les 
      ON les.external_id = grn.grn_language_id::TEXT
      AND les.external_id_type = 'grn_language_id'
      AND les.deleted_at IS NULL
    WHERE grn.iso639_3 IS NOT NULL
      AND TRIM(grn.iso639_3) != ''
  )
  SELECT 
    cs.total as total_grn_entries,
    cs.with_sources as entries_with_sources,
    cs.without_sources as entries_without_sources,
    cs.missing_ids as missing_grn_ids
  FROM coverage_stats cs;
END;
$$;


-- 6. Summary validation function (runs all checks and returns summary)
CREATE OR REPLACE FUNCTION validate_grn_matching_summary () returns TABLE (
  check_name TEXT,
  status TEXT,
  issue_count BIGINT,
  details JSONB
) language plpgsql AS $$
DECLARE
  v_duplicate_count BIGINT;
  v_name_inconsistency_count BIGINT;
  v_parent_child_issues_count BIGINT;
  v_iso_inconsistency_count BIGINT;
  v_coverage_issues_count BIGINT;
BEGIN
  -- Check 1: Duplicate GRN IDs
  SELECT COUNT(*) INTO v_duplicate_count FROM validate_grn_matching_duplicate_ids();
  
  -- Check 2: Name inconsistencies
  SELECT COUNT(*) INTO v_name_inconsistency_count FROM validate_grn_matching_name_consistency();
  
  -- Check 3: Parent-child issues
  SELECT COUNT(*) INTO v_parent_child_issues_count FROM validate_grn_matching_parent_child();
  
  -- Check 4: ISO inconsistencies
  SELECT COUNT(*) INTO v_iso_inconsistency_count 
  FROM validate_grn_matching_iso_consistency()
  WHERE are_related = false;
  
  -- Check 5: Coverage
  SELECT entries_without_sources INTO v_coverage_issues_count 
  FROM validate_grn_matching_coverage();
  
  RETURN QUERY
  SELECT 
    'Duplicate GRN IDs'::TEXT,
    CASE WHEN v_duplicate_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_duplicate_count,
    NULL::JSONB
  UNION ALL
  SELECT 
    'Name Inconsistencies'::TEXT,
    CASE WHEN v_name_inconsistency_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_name_inconsistency_count,
    NULL::JSONB
  UNION ALL
  SELECT 
    'Parent-Child Issues'::TEXT,
    CASE WHEN v_parent_child_issues_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_parent_child_issues_count,
    NULL::JSONB
  UNION ALL
  SELECT 
    'ISO Inconsistencies'::TEXT,
    CASE WHEN v_iso_inconsistency_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_iso_inconsistency_count,
    NULL::JSONB
  UNION ALL
  SELECT 
    'Coverage Issues'::TEXT,
    CASE WHEN v_coverage_issues_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    v_coverage_issues_count,
    NULL::JSONB;
END;
$$;


-- Add comments
comment ON function validate_grn_matching_duplicate_ids () IS 'Validates that each GRN language ID maps to exactly one language entity. Returns any duplicates found.';


comment ON function validate_grn_matching_name_consistency () IS 'Validates that entities with multiple GRN IDs have consistent names. Returns entities with name mismatches.';


comment ON function validate_grn_matching_parent_child () IS 'Validates that GRN parent-child relationships are preserved in language_entities. Returns mismatches.';


comment ON function validate_grn_matching_iso_consistency () IS 'Validates that entities sharing ISO codes are related (parent-child or siblings). Returns unrelated groups.';


comment ON function validate_grn_matching_coverage () IS 'Validates that all GRN cache entries with ISO codes have corresponding language_entity_sources.';


comment ON function validate_grn_matching_summary () IS 'Runs all validation checks and returns a summary. Use this for quick validation after transform.';


COMMIT;

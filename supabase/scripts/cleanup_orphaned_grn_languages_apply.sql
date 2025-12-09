-- ============================================================================
-- APPLY: Orphaned GRN-Only Language Entities Cleanup
-- ============================================================================
-- This script applies the cleanup identified by the preview script.
--
-- PREREQUISITE: Run cleanup_orphaned_grn_languages_preview.sql first
--               and review the results. Only run this if you're satisfied.
--
-- WHAT IT DOES:
-- 1. Transfers GRN sources from orphaned entities to kept entities
-- 2. Updates child entities to point to kept parent
-- 3. Transfers aliases, properties, and region relationships
-- 4. Soft deletes orphaned entities
--
-- SAFETY:
-- - Wrapped in transaction (can rollback)
-- - Uses soft delete (can be reversed)
-- - Only affects entities identified in preview
-- ============================================================================

BEGIN;

-- Recreate the merge plan (same logic as preview script)
-- This ensures the apply script works independently
CREATE TEMP TABLE merge_plan AS
WITH duplicates AS (
  -- Find all duplicate language pairs (same name, level, parent)
  SELECT 
    le1.id AS id1,
    le1.name AS language_name,
    le1.level AS language_level,
    le1.parent_id,
    le2.id AS id2,
    -- Count sources for each entity
    COUNT(DISTINCT CASE WHEN les1.source = 'grn' AND les1.external_id_type = 'grn_language_id' AND les1.deleted_at IS NULL THEN les1.id END) AS id1_grn_count,
    COUNT(DISTINCT CASE WHEN (les1.source != 'grn' OR les1.external_id_type != 'grn_language_id') AND les1.deleted_at IS NULL THEN les1.id END) AS id1_other_count,
    COUNT(DISTINCT CASE WHEN les2.source = 'grn' AND les2.external_id_type = 'grn_language_id' AND les2.deleted_at IS NULL THEN les2.id END) AS id2_grn_count,
    COUNT(DISTINCT CASE WHEN (les2.source != 'grn' OR les2.external_id_type != 'grn_language_id') AND les2.deleted_at IS NULL THEN les2.id END) AS id2_other_count
  FROM language_entities le1
  JOIN language_entities le2 
    ON LOWER(le1.name) = LOWER(le2.name)
    AND le1.level = le2.level
    AND (le1.parent_id = le2.parent_id OR (le1.parent_id IS NULL AND le2.parent_id IS NULL))
    AND le1.id < le2.id  -- Avoid duplicate pairs
    AND le1.deleted_at IS NULL
    AND le2.deleted_at IS NULL
  -- Check sources for both entities
  LEFT JOIN language_entity_sources les1 
    ON les1.language_entity_id = le1.id
  LEFT JOIN language_entity_sources les2 
    ON les2.language_entity_id = le2.id
  GROUP BY le1.id, le1.name, le1.level, le1.parent_id, le2.id
  HAVING 
    -- Case 1: id1 is GRN-only (has GRN, no other) AND id2 has other sources (non-GRN sources exist)
    ((COUNT(DISTINCT CASE WHEN les1.source = 'grn' AND les1.external_id_type = 'grn_language_id' AND les1.deleted_at IS NULL THEN les1.id END) > 0 
      AND COUNT(DISTINCT CASE WHEN (les1.source != 'grn' OR les1.external_id_type != 'grn_language_id') AND les1.deleted_at IS NULL THEN les1.id END) = 0
      AND COUNT(DISTINCT CASE WHEN (les2.source != 'grn' OR les2.external_id_type != 'grn_language_id') AND les2.deleted_at IS NULL THEN les2.id END) > 0)
    OR
    -- Case 2: id2 is GRN-only (has GRN, no other) AND id1 has other sources (non-GRN sources exist)
     (COUNT(DISTINCT CASE WHEN les2.source = 'grn' AND les2.external_id_type = 'grn_language_id' AND les2.deleted_at IS NULL THEN les2.id END) > 0 
      AND COUNT(DISTINCT CASE WHEN (les2.source != 'grn' OR les2.external_id_type != 'grn_language_id') AND les2.deleted_at IS NULL THEN les2.id END) = 0
      AND COUNT(DISTINCT CASE WHEN (les1.source != 'grn' OR les1.external_id_type != 'grn_language_id') AND les1.deleted_at IS NULL THEN les1.id END) > 0))
),
-- Determine which entity is orphaned and which is kept
merge_candidates AS (
  SELECT 
    CASE 
      WHEN id1_grn_count > 0 AND id1_other_count = 0 AND id2_other_count > 0 THEN id1
      WHEN id2_grn_count > 0 AND id2_other_count = 0 AND id1_other_count > 0 THEN id2
    END AS orphaned_id,
    CASE 
      WHEN id1_grn_count > 0 AND id1_other_count = 0 AND id2_other_count > 0 THEN id2
      WHEN id2_grn_count > 0 AND id2_other_count = 0 AND id1_other_count > 0 THEN id1
    END AS kept_id,
    language_name,
    language_level,
    parent_id
  FROM duplicates
  WHERE (id1_grn_count > 0 AND id1_other_count = 0 AND id2_other_count > 0)
     OR (id2_grn_count > 0 AND id2_other_count = 0 AND id1_other_count > 0)
)
SELECT 
  orphaned_id,
  kept_id,
  language_name,
  language_level,
  parent_id
FROM merge_candidates
ORDER BY language_name;

-- Report: Show what will be merged
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM merge_plan;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'APPLYING CLEANUP: % orphaned GRN-only entities will be merged', v_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Transfer GRN sources from orphaned to kept entities
-- ============================================================================
-- Only transfer sources that don't already exist on kept entity
UPDATE language_entity_sources les_orphaned
SET language_entity_id = mp.kept_id
FROM merge_plan mp
WHERE les_orphaned.language_entity_id = mp.orphaned_id
  AND les_orphaned.source = 'grn'
  AND les_orphaned.external_id_type = 'grn_language_id'
  AND les_orphaned.deleted_at IS NULL
  -- Only transfer if this GRN ID doesn't already exist on kept entity
  AND NOT EXISTS (
    SELECT 1 
    FROM language_entity_sources les_kept
    WHERE les_kept.language_entity_id = mp.kept_id
      AND les_kept.source = 'grn'
      AND les_kept.external_id_type = 'grn_language_id'
      AND les_kept.external_id = les_orphaned.external_id
      AND les_kept.deleted_at IS NULL
  );

-- Report transferred sources
DO $$
DECLARE
  v_transferred INTEGER;
BEGIN
  GET DIAGNOSTICS v_transferred = ROW_COUNT;
  RAISE NOTICE '✓ Transferred % GRN sources from orphaned to kept entities', v_transferred;
END $$;

-- ============================================================================
-- STEP 2: Update child entities (dialects) to point to kept parent
-- ============================================================================
UPDATE language_entities le_child
SET parent_id = mp.kept_id,
    updated_at = NOW()
FROM merge_plan mp
WHERE le_child.parent_id = mp.orphaned_id
  AND le_child.deleted_at IS NULL;

-- Report updated children
DO $$
DECLARE
  v_children INTEGER;
BEGIN
  GET DIAGNOSTICS v_children = ROW_COUNT;
  RAISE NOTICE '✓ Updated % child entities to point to kept parent', v_children;
END $$;

-- ============================================================================
-- STEP 3: Transfer other relationships (aliases, properties, regions)
-- ============================================================================

-- Transfer language aliases (only if not duplicate)
UPDATE language_aliases la_orphaned
SET language_entity_id = mp.kept_id
FROM merge_plan mp
WHERE la_orphaned.language_entity_id = mp.orphaned_id
  AND la_orphaned.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM language_aliases la_kept
    WHERE la_kept.language_entity_id = mp.kept_id
      AND LOWER(TRIM(la_kept.alias_name)) = LOWER(TRIM(la_orphaned.alias_name))
      AND la_kept.deleted_at IS NULL
  );

-- Report transferred aliases
DO $$
DECLARE
  v_aliases INTEGER;
BEGIN
  GET DIAGNOSTICS v_aliases = ROW_COUNT;
  IF v_aliases > 0 THEN
    RAISE NOTICE '✓ Transferred % language aliases', v_aliases;
  END IF;
END $$;

-- Transfer language properties (only if not duplicate)
UPDATE language_properties lp_orphaned
SET language_entity_id = mp.kept_id
FROM merge_plan mp
WHERE lp_orphaned.language_entity_id = mp.orphaned_id
  AND lp_orphaned.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM language_properties lp_kept
    WHERE lp_kept.language_entity_id = mp.kept_id
      AND lp_kept.key = lp_orphaned.key
      AND lp_kept.deleted_at IS NULL
  );

-- Report transferred properties
DO $$
DECLARE
  v_properties INTEGER;
BEGIN
  GET DIAGNOSTICS v_properties = ROW_COUNT;
  IF v_properties > 0 THEN
    RAISE NOTICE '✓ Transferred % language properties', v_properties;
  END IF;
END $$;

-- Transfer language-region relationships (only if not duplicate)
UPDATE language_entities_regions ler_orphaned
SET language_entity_id = mp.kept_id
FROM merge_plan mp
WHERE ler_orphaned.language_entity_id = mp.orphaned_id
  AND ler_orphaned.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM language_entities_regions ler_kept
    WHERE ler_kept.language_entity_id = mp.kept_id
      AND ler_kept.region_id = ler_orphaned.region_id
      AND ler_kept.deleted_at IS NULL
  );

-- Report transferred region relationships
DO $$
DECLARE
  v_regions INTEGER;
BEGIN
  GET DIAGNOSTICS v_regions = ROW_COUNT;
  IF v_regions > 0 THEN
    RAISE NOTICE '✓ Transferred % language-region relationships', v_regions;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Soft delete orphaned entities
-- ============================================================================
UPDATE language_entities
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id IN (SELECT orphaned_id FROM merge_plan);

-- Report deleted entities
DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_deleted FROM merge_plan;
  RAISE NOTICE '✓ Soft deleted % orphaned GRN-only language entities', v_deleted;
END $$;

-- ============================================================================
-- FINAL REPORT
-- ============================================================================
DO $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM merge_plan;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total orphaned entities processed: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the changes above';
  RAISE NOTICE '2. If satisfied, COMMIT the transaction';
  RAISE NOTICE '3. If not satisfied, ROLLBACK the transaction';
  RAISE NOTICE '4. After committing, run transform_language_caches_to_entities()';
  RAISE NOTICE '   to properly match remaining GRN cache entries';
  RAISE NOTICE '========================================';
END $$;

-- Show summary of what was merged
SELECT 
  mp.language_name,
  mp.language_level,
  mp.orphaned_id AS deleted_entity_id,
  mp.kept_id AS kept_entity_id,
  COUNT(DISTINCT les_kept.id) AS kept_entity_source_count,
  STRING_AGG(DISTINCT les_kept.source || ':' || les_kept.external_id_type, ', ' ORDER BY les_kept.source || ':' || les_kept.external_id_type) AS kept_entity_sources
FROM merge_plan mp
LEFT JOIN language_entity_sources les_kept 
  ON les_kept.language_entity_id = mp.kept_id 
  AND les_kept.deleted_at IS NULL
GROUP BY mp.language_name, mp.language_level, mp.orphaned_id, mp.kept_id
ORDER BY mp.language_name
LIMIT 50;

-- Clean up temp tables
DROP TABLE IF EXISTS merge_plan;

-- ============================================================================
-- IMPORTANT: You must explicitly COMMIT or ROLLBACK
-- ============================================================================
-- The transaction is still open. Review all the results above, then:
--
-- TO SAVE CHANGES: Uncomment the line below and run again
-- COMMIT;
--
-- TO UNDO CHANGES: Uncomment the line below and run again  
-- ROLLBACK;
--
-- If you don't COMMIT or ROLLBACK, the transaction will remain open.
-- ============================================================================

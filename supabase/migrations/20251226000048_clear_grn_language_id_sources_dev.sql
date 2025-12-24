-- 20251226000048_clear_grn_language_id_sources_dev.sql
-- Clear all GRN language_id sources to provide clean slate for testing new matching logic
-- Preserves ROLV codes (external_id_type = 'rolv_code') as they come from seed data
BEGIN;


-- Soft delete all GRN language_id sources
-- This allows for potential rollback if needed
UPDATE language_entity_sources
SET
  deleted_at = NOW()
WHERE
  source = 'grn'
  AND external_id_type = 'grn_language_id'
  AND deleted_at IS NULL;


-- Log the count of sources cleared
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM language_entity_sources
  WHERE source = 'grn'
    AND external_id_type = 'grn_language_id'
    AND deleted_at IS NOT NULL;
  
  RAISE NOTICE 'Cleared % GRN language_id sources (soft deleted)', v_count;
END $$;


COMMIT;

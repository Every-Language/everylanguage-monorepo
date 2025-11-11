-- Add funding status features: in_progress status and auto-update triggers
-- This migration adds the 'in_progress' status to entity_status enum and implements
-- automatic status updates for languages and regions based on project allocations
-- and language availability.
-- ============================================================================
-- 1. ADD 'in_progress' TO entity_status ENUM
-- ============================================================================
-- Note: PostgreSQL doesn't allow inserting enum values in the middle, so we add it at the end
-- The logical order is: draft, available, in_progress, funded, archived
ALTER TYPE entity_status
ADD value if NOT EXISTS 'in_progress';


-- Update comment to reflect new status
comment ON type entity_status IS 'Funding availability status: draft (not shown), available (accepting donations), in_progress (has project with allocations), funded (goal met), archived (closed)';


-- ============================================================================
-- 2. LANGUAGE AUTO-UPDATE TRIGGER
-- ============================================================================
-- Function to check if a language has at least one project with at least one active allocation
CREATE OR REPLACE FUNCTION check_language_project_allocations (language_id UUID) returns BOOLEAN language plpgsql stable AS $$
DECLARE
  has_allocation BOOLEAN := FALSE;
BEGIN
  -- Check if language has projects with active allocations from donation_allocations
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN donation_allocations da ON da.project_id = p.id
    WHERE p.target_language_entity_id = language_id
      AND p.deleted_at IS NULL
      AND da.project_id IS NOT NULL
      AND (da.effective_to IS NULL OR da.effective_to >= CURRENT_DATE)
  ) INTO has_allocation;

  -- If not found, check language_adoption_sponsorship_allocations (if table exists)
  IF NOT has_allocation THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'language_adoption_sponsorship_allocations'
    ) THEN
      SELECT EXISTS (
        SELECT 1
        FROM projects p
        JOIN language_adoption_sponsorship_allocations lasa ON lasa.project_id = p.id
        WHERE p.target_language_entity_id = language_id
          AND p.deleted_at IS NULL
          AND (lasa.effective_to IS NULL OR lasa.effective_to >= CURRENT_DATE)
      ) INTO has_allocation;
    END IF;
  END IF;

  RETURN has_allocation;
END;
$$;


comment ON function check_language_project_allocations IS 'Checks if a language has at least one project with at least one active allocation';


-- Function to update language funding status based on project allocations
CREATE OR REPLACE FUNCTION update_language_funding_status_from_allocations () returns trigger language plpgsql AS $$
DECLARE
  affected_project_id UUID;
  affected_language_id UUID;
  current_status entity_status;
  has_allocation BOOLEAN;
BEGIN
  -- Get the project_id from the trigger context
  IF TG_TABLE_NAME = 'donation_allocations' THEN
    affected_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSIF TG_TABLE_NAME = 'language_adoption_sponsorship_allocations' THEN
    affected_project_id := COALESCE(NEW.project_id, OLD.project_id);
  ELSE
    RETURN NULL;
  END IF;

  -- If no project_id, nothing to do
  IF affected_project_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the language_id from the project
  SELECT target_language_entity_id INTO affected_language_id
  FROM projects
  WHERE id = affected_project_id AND deleted_at IS NULL;

  -- If no language found, nothing to do
  IF affected_language_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get current status
  SELECT funding_status INTO current_status
  FROM language_entities
  WHERE id = affected_language_id AND deleted_at IS NULL;

  -- If language doesn't exist or is deleted, nothing to do
  IF current_status IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if language has allocations
  has_allocation := check_language_project_allocations(affected_language_id);

  -- Update status based on allocation status
  IF has_allocation AND current_status = 'available' THEN
    -- Language now has allocations, move to in_progress
    UPDATE language_entities
    SET funding_status = 'in_progress'
    WHERE id = affected_language_id;
  ELSIF NOT has_allocation AND current_status = 'in_progress' THEN
    -- Language no longer has allocations, move back to available
    UPDATE language_entities
    SET funding_status = 'available'
    WHERE id = affected_language_id;
  END IF;

  RETURN NULL;
END;
$$;


comment ON function update_language_funding_status_from_allocations IS 'Trigger function to update language funding_status when allocations change';


-- Create triggers on allocation tables
DROP TRIGGER if EXISTS trg_update_language_funding_status_donation_allocations ON donation_allocations;


CREATE TRIGGER trg_update_language_funding_status_donation_allocations
AFTER insert
OR
UPDATE
OR delete ON donation_allocations FOR each ROW
EXECUTE function update_language_funding_status_from_allocations ();


-- Drop trigger on language_adoption_sponsorship_allocations if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'language_adoption_sponsorship_allocations'
  ) THEN
    DROP TRIGGER IF EXISTS trg_update_language_funding_status_sponsorship_allocations ON language_adoption_sponsorship_allocations;
    CREATE TRIGGER trg_update_language_funding_status_sponsorship_allocations
      AFTER INSERT OR UPDATE OR DELETE ON language_adoption_sponsorship_allocations
      FOR EACH ROW
      EXECUTE FUNCTION update_language_funding_status_from_allocations();
  END IF;
END $$;


-- ============================================================================
-- 3. REGION AUTO-UPDATE FUNCTION AND TRIGGER
-- ============================================================================
-- Function to update region funding status based on linked languages
CREATE OR REPLACE FUNCTION update_region_funding_status (region_id UUID) returns void language plpgsql AS $$
DECLARE
  linked_language_id UUID;
  language_status entity_status;
  has_available_language BOOLEAN := FALSE;
  current_region_status entity_status;
  language_hierarchy_record RECORD;
BEGIN
  -- Get current region status
  SELECT funding_status INTO current_region_status
  FROM regions
  WHERE id = region_id AND deleted_at IS NULL;

  -- If region doesn't exist or is deleted, nothing to do
  IF current_region_status IS NULL THEN
    RETURN;
  END IF;

  -- Only auto-update if status is 'draft' or 'available'
  -- Other statuses (funded, archived, in_progress) are manually set
  IF current_region_status NOT IN ('draft', 'available') THEN
    RETURN;
  END IF;

  -- Get all languages linked to this region
  FOR linked_language_id IN
    SELECT DISTINCT language_entity_id
    FROM language_entities_regions
    WHERE region_id = region_id AND deleted_at IS NULL
  LOOP
    -- For each linked language, check the language itself and its hierarchy
    -- (ancestors and descendants) for 'available' status
    FOR language_hierarchy_record IN
      SELECT hierarchy_entity_id
      FROM get_language_entity_hierarchy(linked_language_id, 10, 10)
    LOOP
      -- Check if this language in the hierarchy has 'available' status
      SELECT funding_status INTO language_status
      FROM language_entities
      WHERE id = language_hierarchy_record.hierarchy_entity_id
        AND deleted_at IS NULL;

      IF language_status = 'available' THEN
        has_available_language := TRUE;
        EXIT; -- Found one, no need to check further
      END IF;
    END LOOP;

    -- If we found an available language, no need to check more regions
    IF has_available_language THEN
      EXIT;
    END IF;
  END LOOP;

  -- Update region status based on findings
  IF has_available_language AND current_region_status = 'draft' THEN
    -- Region should be available
    UPDATE regions
    SET funding_status = 'available'
    WHERE id = region_id;
  ELSIF NOT has_available_language AND current_region_status = 'available' THEN
    -- Region should be draft
    UPDATE regions
    SET funding_status = 'draft'
    WHERE id = region_id;
  END IF;
END;
$$;


comment ON function update_region_funding_status IS 'Updates region funding_status based on linked languages hierarchy (only sets draft/available, other statuses are manual)';


-- Trigger function to update regions when language funding_status changes
CREATE OR REPLACE FUNCTION trg_update_region_funding_status () returns trigger language plpgsql AS $$
DECLARE
  affected_region_id UUID;
BEGIN
  -- Only trigger on funding_status changes
  IF OLD.funding_status IS NOT DISTINCT FROM NEW.funding_status THEN
    RETURN NEW;
  END IF;

  -- Only trigger if status changed to or from 'available'
  IF OLD.funding_status != 'available' AND NEW.funding_status != 'available' THEN
    RETURN NEW;
  END IF;

  -- Update all regions linked to this language
  FOR affected_region_id IN
    SELECT DISTINCT region_id
    FROM language_entities_regions
    WHERE language_entity_id = NEW.id AND deleted_at IS NULL
  LOOP
    PERFORM update_region_funding_status(affected_region_id);
  END LOOP;

  RETURN NEW;
END;
$$;


comment ON function trg_update_region_funding_status IS 'Trigger function to update region funding_status when language funding_status changes';


-- Create trigger on language_entities table
DROP TRIGGER if EXISTS trg_update_region_funding_status ON language_entities;


CREATE TRIGGER trg_update_region_funding_status
AFTER
UPDATE ON language_entities FOR each ROW WHEN (
  old.funding_status IS DISTINCT FROM new.funding_status
)
EXECUTE function trg_update_region_funding_status ();


-- ============================================================================
-- 4. INITIAL STATUS UPDATE
-- ============================================================================
-- Note: These UPDATE statements are moved to a separate migration because
-- PostgreSQL doesn't allow using newly added enum values in the same transaction.
-- See migration 20251112094122_update_funding_status_initial_data.sql

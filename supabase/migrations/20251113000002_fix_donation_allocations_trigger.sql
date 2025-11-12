-- Fix trigger function to use language_funding table instead of language_entities.funding_status
-- The funding_status column was moved from language_entities to language_funding in migration 20251112094121_refactor_funding_status.sql
-- but the trigger function was not updated.
-- Function to update language funding status based on project allocations
CREATE OR REPLACE FUNCTION update_language_funding_status_from_allocations () returns trigger language plpgsql AS $$
DECLARE
  affected_project_id UUID;
  affected_language_id UUID;
  current_status TEXT;
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

  -- Get current status from language_funding table (not language_entities)
  SELECT funding_status INTO current_status
  FROM language_funding
  WHERE language_entity_id = affected_language_id AND deleted_at IS NULL;

  -- If language doesn't have a funding record, nothing to do
  IF current_status IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if language has allocations
  has_allocation := check_language_project_allocations(affected_language_id);

  -- Update status based on allocation status in language_funding table
  IF has_allocation AND current_status = 'available' THEN
    -- Language now has allocations, move to in_progress
    UPDATE language_funding
    SET funding_status = 'in_progress', updated_at = NOW()
    WHERE language_entity_id = affected_language_id AND deleted_at IS NULL;
  ELSIF NOT has_allocation AND current_status = 'in_progress' THEN
    -- Language no longer has allocations, move back to available
    UPDATE language_funding
    SET funding_status = 'available', updated_at = NOW()
    WHERE language_entity_id = affected_language_id AND deleted_at IS NULL;
  END IF;

  RETURN NULL;
END;
$$;


comment ON function update_language_funding_status_from_allocations IS 'Trigger function to update language funding_status when allocations change. Uses language_funding table.';

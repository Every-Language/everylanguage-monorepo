-- Harden language funding auto-update triggers against RLS
-- Migration: 20251226000056_harden_language_funding_triggers_rls.sql
--
-- Problem:
-- - check_language_project_allocations() and update_language_funding_status_from_allocations()
--   both read from RLS-protected tables (projects, donation_allocations, language_funding)
-- - These functions are invoked from AFTER triggers on donation_allocations and
--   language_adoption_sponsorship_allocations using the caller's privileges
-- - When called from an authenticated context, their internal SELECTs can hit
--   42501 "query would be affected by row-level security policy" errors for
--   tables like projects, causing otherwise valid INSERTs into donation_allocations
--   to fail
--
-- Solution:
-- - Recreate both helper functions as SECURITY DEFINER
-- - Disable row security within the function bodies using SET LOCAL row_security = off
-- - Limit search_path to "public, pg_temp" to avoid hijacking
-- - Keep the business logic identical (only change execution context)
--
-- This follows the same hardening pattern used for media_files triggers in
-- 20251226000053_harden_media_files_verses_triggers.sql and for
-- validate_donation_allocation().
-- 1) Harden check_language_project_allocations()
CREATE OR REPLACE FUNCTION public.check_language_project_allocations (language_id UUID) returns BOOLEAN language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  has_allocation BOOLEAN := FALSE;
BEGIN
  -- Bypass RLS inside this helper so validation can see all relevant rows
  SET LOCAL row_security = off;

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


comment ON function public.check_language_project_allocations IS 'Checks if a language has at least one project with at least one active allocation. Runs as SECURITY DEFINER with row_security disabled to avoid RLS recursion.';


REVOKE ALL ON function public.check_language_project_allocations (UUID)
FROM
  public;


GRANT
EXECUTE ON function public.check_language_project_allocations (UUID) TO authenticated;


-- 2) Harden update_language_funding_status_from_allocations()
CREATE OR REPLACE FUNCTION public.update_language_funding_status_from_allocations () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  affected_project_id UUID;
  affected_language_id UUID;
  current_status TEXT;
  has_allocation BOOLEAN;
BEGIN
  -- Bypass RLS inside this helper so it can read/write across finance tables
  SET LOCAL row_security = off;

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


comment ON function public.update_language_funding_status_from_allocations IS 'Trigger function to update language_funding.funding_status when allocations change. Runs as SECURITY DEFINER with row_security disabled to avoid RLS recursion.';


REVOKE ALL ON function public.update_language_funding_status_from_allocations ()
FROM
  public;


GRANT
EXECUTE ON function public.update_language_funding_status_from_allocations () TO authenticated;

-- Harden donation_allocations validation trigger against RLS
-- Migration: 20251226000055_harden_donation_allocations_trigger_rls.sql
--
-- Problem:
-- - BEFORE INSERT/UPDATE trigger validate_donation_allocation() reads from donation_allocations
-- - donation_allocations has RLS enabled
-- - Trigger runs with caller privileges, so the SELECT inside it is subject to RLS
-- - For some users (including system admins via RBAC), this SELECT can hit a 42501
--   "query would be affected by row-level security policy" error, causing the
--   original INSERT to fail even when the insert policy itself allows it
--
-- Solution:
-- - Recreate validate_donation_allocation() as SECURITY DEFINER
-- - Disable row security within the function body using SET LOCAL row_security = off
-- - Limit search_path to "public, pg_temp" to avoid hijacking
-- - Keep the validation logic identical (only change execution context)
--
-- This mirrors the hardening pattern used for media_files in
-- 20251226000053_harden_media_files_verses_triggers.sql
CREATE OR REPLACE FUNCTION public.validate_donation_allocation () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_donation_amount INTEGER;
  v_total_allocated INTEGER;
BEGIN
  -- Bypass RLS inside this helper so validation can see all relevant rows
  SET LOCAL row_security = off;

  -- Get the donation amount
  SELECT amount_cents INTO v_donation_amount
  FROM donations
  WHERE id = NEW.donation_id;
  
  -- Calculate total allocated (excluding this row)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_allocated
  FROM donation_allocations
  WHERE donation_id = NEW.donation_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Check if total allocation would exceed donation amount
  IF (v_total_allocated + NEW.amount_cents) > v_donation_amount THEN
    RAISE EXCEPTION 'Total allocations (% + %) exceed donation amount (%)', 
      v_total_allocated, 
      NEW.amount_cents, 
      v_donation_amount
      USING HINT = 'Reduce allocation amount or remove existing allocations';
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.validate_donation_allocation () IS 'Validates that total allocations do not exceed donation amount. Runs as SECURITY DEFINER with row_security disabled to avoid RLS recursion.';


-- Tighten function privileges: no public execute, only authenticated role
REVOKE ALL ON function public.validate_donation_allocation ()
FROM
  public;


GRANT
EXECUTE ON function public.validate_donation_allocation () TO authenticated;

-- Update donations table to require both user_id and partner_org_id
-- This aligns with the new design where ALL donations are linked to:
-- 1. A user (either anonymous or authenticated)
-- 2. A partner_org (either individual or non-individual)
-- ============================================================================
-- Step 1: Drop the old XOR constraint that required only one of user_id or partner_org_id
ALTER TABLE donations
DROP CONSTRAINT if EXISTS donations_donor_check;


-- Step 2: Delete all existing donations that don't satisfy the new constraint
-- This is safe because:
-- 1. We're in a narrow window with no live/production data
-- 2. CASCADE deletes will automatically clean up donation_allocations and payment_attempts
-- 3. subscriptions.original_donation_id will be set to NULL automatically (ON DELETE SET NULL)
-- 
-- Note: This will delete ALL donations. Only proceed if you're certain there's no live data.
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete all donations (they don't satisfy the new constraint anyway)
  DELETE FROM donations;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % donations. Related donation_allocations and payment_attempts were cascade deleted. subscriptions.original_donation_id references were set to NULL.', v_deleted_count;
END $$;


-- Step 3: Make both columns NOT NULL
ALTER TABLE donations
ALTER COLUMN user_id
SET NOT NULL,
ALTER COLUMN partner_org_id
SET NOT NULL;


-- Step 4: Add a new constraint requiring both to be NOT NULL (for clarity and documentation)
-- Note: This is technically redundant since both columns are NOT NULL, but it documents the design intent
ALTER TABLE donations
ADD CONSTRAINT donations_donor_check CHECK (
  user_id IS NOT NULL
  AND partner_org_id IS NOT NULL
);


-- Step 5: Update the table comment to reflect the new design
comment ON TABLE donations IS 'Donations table. All donations must have both a user_id (anonymous or authenticated user) and a partner_org_id (individual or non-individual partner organization).';

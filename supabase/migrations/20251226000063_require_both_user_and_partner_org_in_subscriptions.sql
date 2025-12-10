-- Update subscriptions table to require both user_id and partner_org_id
-- This aligns with the new design where ALL subscriptions are linked to:
-- 1. A user (either anonymous or authenticated)
-- 2. A partner_org (either individual or non-individual)
-- ============================================================================
-- Step 1: Drop the old XOR constraint that required only one of user_id or partner_org_id
ALTER TABLE subscriptions
DROP CONSTRAINT if EXISTS subscriptions_donor_check;


-- Step 2: Migrate existing subscriptions that don't satisfy the new constraint
-- For subscriptions with user_id but no partner_org_id, we need to find/create the individual partner org
-- For subscriptions with partner_org_id but no user_id, we need to find the user from the original donation
DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_sub RECORD;
  v_user_id UUID;
  v_partner_org_id UUID;
BEGIN
  -- Handle subscriptions with user_id but no partner_org_id
  -- Find or create individual partner org for the user
  FOR v_sub IN 
    SELECT id, user_id, partner_org_id, original_donation_id
    FROM subscriptions
    WHERE user_id IS NOT NULL AND partner_org_id IS NULL
  LOOP
    -- Try to find individual partner org for this user
    SELECT id INTO v_partner_org_id
    FROM partner_orgs
    WHERE created_by = v_sub.user_id
      AND is_individual = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If found, update subscription
    IF v_partner_org_id IS NOT NULL THEN
      UPDATE subscriptions
      SET partner_org_id = v_partner_org_id
      WHERE id = v_sub.id;
      v_migrated_count := v_migrated_count + 1;
    ELSE
      -- If no individual org exists, try to get partner_org_id from original donation
      IF v_sub.original_donation_id IS NOT NULL THEN
        SELECT partner_org_id INTO v_partner_org_id
        FROM donations
        WHERE id = v_sub.original_donation_id;
        
        IF v_partner_org_id IS NOT NULL THEN
          UPDATE subscriptions
          SET partner_org_id = v_partner_org_id
          WHERE id = v_sub.id;
          v_migrated_count := v_migrated_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Handle subscriptions with partner_org_id but no user_id
  -- Get user_id from original donation
  FOR v_sub IN 
    SELECT id, user_id, partner_org_id, original_donation_id
    FROM subscriptions
    WHERE user_id IS NULL AND partner_org_id IS NOT NULL
  LOOP
    -- Try to get user_id from original donation
    IF v_sub.original_donation_id IS NOT NULL THEN
      SELECT user_id INTO v_user_id
      FROM donations
      WHERE id = v_sub.original_donation_id;
      
      IF v_user_id IS NOT NULL THEN
        UPDATE subscriptions
        SET user_id = v_user_id
        WHERE id = v_sub.id;
        v_migrated_count := v_migrated_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migrated % subscriptions to have both user_id and partner_org_id.', v_migrated_count;
  
  -- Check for any remaining subscriptions that don't satisfy the constraint
  IF EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id IS NULL OR partner_org_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot proceed: Some subscriptions still have NULL user_id or partner_org_id. These must be migrated manually.';
  END IF;
END $$;


-- Step 3: Make both columns NOT NULL
ALTER TABLE subscriptions
ALTER COLUMN user_id
SET NOT NULL,
ALTER COLUMN partner_org_id
SET NOT NULL;


-- Step 4: Add a new constraint requiring both to be NOT NULL (for clarity and documentation)
-- Note: This is technically redundant since both columns are NOT NULL, but it documents the design intent
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_donor_check CHECK (
  user_id IS NOT NULL
  AND partner_org_id IS NOT NULL
);


-- Step 5: Update the table comment to reflect the new design
comment ON TABLE subscriptions IS 'Subscriptions table. All subscriptions must have both a user_id (anonymous or authenticated user) and a partner_org_id (individual or non-individual partner organization).';

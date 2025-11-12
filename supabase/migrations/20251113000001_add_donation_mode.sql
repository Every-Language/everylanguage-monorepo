-- Add donation_mode enum and column to donations table
-- This tracks whether a donation is an adoption (full funding) or contribution (partial funding)
-- Create enum type (PostgreSQL doesn't support IF NOT EXISTS for CREATE TYPE, so use DO block)
DO $$ BEGIN
  CREATE TYPE donation_mode AS ENUM('adoption', 'contribution');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


comment ON type donation_mode IS 'Donation mode: adoption (full funding of entity) or contribution (partial funding)';


-- Add column to donations table
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS donation_mode donation_mode NOT NULL DEFAULT 'adoption';


-- Add index for filtering by donation mode
CREATE INDEX if NOT EXISTS idx_donations_donation_mode ON donations (donation_mode)
WHERE
  deleted_at IS NULL;


-- Add comment
comment ON COLUMN donations.donation_mode IS 'Whether this donation is a full adoption or partial contribution';


-- ============================================================================
-- Add public read policies for donation flow
-- ============================================================================
-- Allow anonymous/public users to read languages with available/in_progress status
-- Drop policy if it exists to avoid conflicts
DROP POLICY if EXISTS language_funding_read_public ON language_funding;


CREATE POLICY language_funding_read_public ON language_funding FOR
SELECT
  TO anon,
  authenticated USING (
    funding_status IN ('available', 'in_progress')
    AND deleted_at IS NULL
  );


-- Allow anonymous/public users to read public operations
-- Drop policy if it exists to avoid conflicts
DROP POLICY if EXISTS operations_read_public ON operations;


CREATE POLICY operations_read_public ON operations FOR
SELECT
  TO anon,
  authenticated USING (
    status = 'available'
    AND is_public = TRUE
    AND deleted_at IS NULL
  );


-- Allow anonymous/public users to read region_funding view
-- Views don't support RLS policies directly, so we grant SELECT permission
-- The view will filter based on the USING clause in the query
GRANT
SELECT
  ON region_funding TO anon,
  authenticated;

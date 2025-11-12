-- Add donation_mode enum and column to donations table
-- This tracks whether a donation is an adoption (full funding) or contribution (partial funding)
-- Create enum type
CREATE TYPE if NOT EXISTS donation_mode AS ENUM('adoption', 'contribution');


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
CREATE POLICY language_funding_read_public ON language_funding FOR
SELECT
  TO anon,
  authenticated USING (
    funding_status IN ('available', 'in_progress')
    AND deleted_at IS NULL
  );


-- Allow anonymous/public users to read public operations
CREATE POLICY operations_read_public ON operations FOR
SELECT
  TO anon,
  authenticated USING (
    status = 'available'
    AND is_public = TRUE
    AND deleted_at IS NULL
  );


-- Allow anonymous/public users to read region_funding view
-- Views can have RLS policies without explicitly enabling RLS
CREATE POLICY region_funding_read_public ON region_funding FOR
SELECT
  TO anon,
  authenticated USING (funding_status IN ('available', 'in_progress'));

-- Add is_manual flag to donations table
-- This flag distinguishes manually created donations (from external sources)
-- from donations created through the internal Stripe checkout flow
-- ============================================================================
-- Add is_manual column with default false (existing donations are from Stripe)
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;


-- Add comment explaining the field
comment ON COLUMN donations.is_manual IS 'True if the donation was manually created by an admin (external/manual donation), false if created through internal Stripe checkout flow';

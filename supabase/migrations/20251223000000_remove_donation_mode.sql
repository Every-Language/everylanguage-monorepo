-- Remove donation_mode column and enum
-- Simplifies donation flow by removing adoption/contribution mode distinction
-- ============================================================================
-- REMOVE DONATION_MODE
-- ============================================================================
-- Drop index first
DROP INDEX if EXISTS idx_donations_donation_mode;


-- Remove column from donations table
ALTER TABLE donations
DROP COLUMN IF EXISTS donation_mode;


-- Drop enum type (will fail if other tables use it, but we know it's only used here)
DROP TYPE if EXISTS donation_mode;

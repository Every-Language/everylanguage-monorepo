-- Migration: Optimize Donation Flow
-- Date: 2024-11-01
-- Description: Add partner org types, payment methods, and bank transfer tracking
-- 1. Add columns to partner_orgs table
ALTER TABLE partner_orgs
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS is_individual BOOLEAN DEFAULT FALSE NOT NULL;


comment ON COLUMN partner_orgs.is_public IS 'Allows organization to appear in public search for adoptions';


comment ON COLUMN partner_orgs.is_individual IS 'Distinguishes individual donors from organizational partners';


-- 2. Update sponsorships table
-- Add payment_method column
ALTER TABLE sponsorships
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card' NOT NULL CHECK (payment_method IN ('card', 'bank_transfer'));


-- Remove project_id column (no longer needed)
ALTER TABLE sponsorships
DROP COLUMN IF EXISTS project_id;


-- Add new status to enum
ALTER TYPE sponsorship_status
ADD value if NOT EXISTS 'pending_bank_transfer';


comment ON COLUMN sponsorships.payment_method IS 'Payment method used for this sponsorship';


-- 3. Add bank transfer expiry tracking to language_adoptions
ALTER TABLE language_adoptions
ADD COLUMN IF NOT EXISTS bank_transfer_expiry_at TIMESTAMP WITH TIME ZONE;


comment ON COLUMN language_adoptions.bank_transfer_expiry_at IS 'Expiry deadline for on_hold adoptions awaiting bank transfer';


-- 4. Create index for public partner org searches
CREATE INDEX if NOT EXISTS idx_partner_orgs_is_public ON partner_orgs (is_public)
WHERE
  is_public = TRUE;


-- 5. Create index for bank transfer expiry queries
CREATE INDEX if NOT EXISTS idx_language_adoptions_bank_transfer_expiry ON language_adoptions (status, bank_transfer_expiry_at)
WHERE
  status = 'on_hold'
  AND bank_transfer_expiry_at IS NOT NULL;


-- 6. Create trigram index for partner org name search (if pg_trgm not already enabled)
CREATE EXTENSION if NOT EXISTS pg_trgm;


CREATE INDEX if NOT EXISTS idx_partner_orgs_name_trgm ON partner_orgs USING gin (name gin_trgm_ops);

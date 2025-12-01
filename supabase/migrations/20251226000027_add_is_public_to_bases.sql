-- Add is_public column to bases table
-- Migration: 20251226000027_add_is_public_to_bases.sql
-- This migration adds is_public column to bases table to control public visibility
-- ============================================================================
-- Add is_public column
ALTER TABLE public.bases
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE NOT NULL;


-- Add comment
comment ON COLUMN public.bases.is_public IS 'Allows base to appear in public search and be visible without explicit permissions';


-- Create index for public base searches
CREATE INDEX if NOT EXISTS idx_bases_is_public ON public.bases (is_public)
WHERE
  is_public = TRUE;

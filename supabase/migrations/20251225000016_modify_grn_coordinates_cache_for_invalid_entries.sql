-- 20251225000016_modify_grn_coordinates_cache_for_invalid_entries.sql
-- Modify cache table to allow NULLs for invalid entries from API
-- Also create skipped entries table for transform-level tracking
BEGIN;


-- Modify cache table to allow NULLs (for invalid API entries)
ALTER TABLE grn_language_coordinates_cache
ALTER COLUMN grn_number
DROP NOT NULL,
ALTER COLUMN country_name
DROP NOT NULL,
ALTER COLUMN location
DROP NOT NULL;


-- Update unique constraint to handle NULLs properly
-- PostgreSQL unique constraints treat NULLs as distinct, so we need a partial unique index
-- Drop the existing unique constraint if it exists (it's created as a constraint, not an index)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'grn_language_coordinates_cache_grn_number_country_name_key'
  ) THEN
    ALTER TABLE grn_language_coordinates_cache 
      DROP CONSTRAINT grn_language_coordinates_cache_grn_number_country_name_key;
  END IF;
END $$;


-- Create partial unique index for entries with both fields
CREATE UNIQUE INDEX if NOT EXISTS idx_grn_coords_cache_unique_valid ON grn_language_coordinates_cache (grn_number, country_name)
WHERE
  grn_number IS NOT NULL
  AND country_name IS NOT NULL;


-- Create table for tracking unmatched entries from transform
CREATE TABLE grn_coordinates_unmatched (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Reference to cache entry
  cache_id UUID NOT NULL REFERENCES grn_language_coordinates_cache (id) ON DELETE CASCADE,
  -- Cache data (denormalized for easier querying)
  grn_number INTEGER NULL,
  language_name TEXT NULL,
  iso_code TEXT NULL,
  country_name TEXT NULL,
  -- Reason for skipping
  skip_reason TEXT NOT NULL, -- 'no_language_entity', 'no_region', 'no_language_entity_and_region'
  -- Metadata
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: mark as resolved/ignored
  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL, -- User who resolved it
  resolution_notes TEXT NULL,
  -- Ensure one entry per cache_id per skip_reason
  UNIQUE (cache_id, skip_reason)
);


CREATE INDEX idx_grn_coords_unmatched_reason ON grn_coordinates_unmatched (skip_reason);


CREATE INDEX idx_grn_coords_unmatched_grn_number ON grn_coordinates_unmatched (grn_number)
WHERE
  grn_number IS NOT NULL;


CREATE INDEX idx_grn_coords_unmatched_country_name ON grn_coordinates_unmatched (country_name)
WHERE
  country_name IS NOT NULL;


CREATE INDEX idx_grn_coords_unmatched_resolved ON grn_coordinates_unmatched (resolved_at)
WHERE
  resolved_at IS NULL;


CREATE INDEX idx_grn_coords_unmatched_last_seen ON grn_coordinates_unmatched (last_seen_at);


CREATE INDEX idx_grn_coords_unmatched_cache_id ON grn_coordinates_unmatched (cache_id);


comment ON TABLE grn_coordinates_unmatched IS 'Tracks cache entries that could not be matched during transform (no language_entity or no region match). Useful for data quality review and manual cleanup.';


comment ON COLUMN grn_coordinates_unmatched.skip_reason IS 'Reason why entry was unmatched: no_language_entity, no_region, or no_language_entity_and_region';


COMMIT;

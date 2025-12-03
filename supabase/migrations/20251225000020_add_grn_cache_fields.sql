-- 20251225000020_add_grn_cache_fields.sql
-- Add missing fields from GRN API to grn_language_cache table, including JSONB columns for nested structures
-- 
-- NOTE: After applying this migration, regenerate TypeScript types by running:
-- npm run db:generate-types
BEGIN;


-- Add new columns
ALTER TABLE grn_language_cache
ADD COLUMN name_ietf TEXT,
ADD COLUMN audio_sample BOOLEAN,
ADD COLUMN ietf TEXT,
ADD COLUMN media_ids JSONB,
ADD COLUMN alternate_names JSONB,
ADD COLUMN programs JSONB;


-- Add indexes
CREATE INDEX idx_grn_cache_ietf ON grn_language_cache (ietf)
WHERE
  ietf IS NOT NULL;


CREATE INDEX idx_grn_cache_audio_sample ON grn_language_cache (audio_sample)
WHERE
  audio_sample = TRUE;


-- GIN indexes for JSONB queries
CREATE INDEX idx_grn_cache_alternate_names_gin ON grn_language_cache USING gin (alternate_names)
WHERE
  alternate_names IS NOT NULL;


CREATE INDEX idx_grn_cache_programs_gin ON grn_language_cache USING gin (programs)
WHERE
  programs IS NOT NULL;


COMMIT;

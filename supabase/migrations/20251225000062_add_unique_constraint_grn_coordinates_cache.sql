-- 20251225000062_add_unique_constraint_grn_coordinates_cache.sql
-- Add unique constraint for PostgREST upsert compatibility
-- PostgreSQL unique constraints allow multiple NULLs (they're treated as distinct),
-- so this works correctly with NULL values while enabling PostgREST's onConflict to work
BEGIN;


-- Add unique constraint for PostgREST upsert compatibility
-- This is required because PostgREST's upsert onConflict parameter requires a unique constraint,
-- not just a unique index. The partial unique index (idx_grn_coords_cache_unique_valid) remains
-- for performance, but we need this constraint for the upsert operation to work.
ALTER TABLE grn_language_coordinates_cache
ADD CONSTRAINT grn_language_coordinates_cache_grn_number_country_name_key UNIQUE (grn_number, country_name);


COMMIT;

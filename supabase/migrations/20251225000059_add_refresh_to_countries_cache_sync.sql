-- 20251225000059_add_refresh_to_countries_cache_sync.sql
-- Add refresh_mv_region_stats() call documentation to transform_jp_countries_cache_to_regions function
BEGIN;


-- Add comment to function indicating refresh should be called
comment ON function transform_jp_countries_cache_to_regions () IS 'Transforms jp_countries_cache into canonical regions table. Matches countries by ROG3 (FIPS), ISO3, ISO2, name, or alias. Creates new regions for unmatched countries. Creates region_sources and region_aliases entries. Insert/update only - never deletes regions. IMPORTANT: Call refresh_mv_region_stats() after this function completes to update materialized views.';


COMMIT;

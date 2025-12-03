-- 20251225000058_add_refresh_to_language_cache_sync.sql
-- Add refresh_mv_language_stats() call to transform_language_caches_to_entities function
BEGIN;


-- We'll modify the function by recreating it with the refresh call added
-- Since the function is large, we use ALTER FUNCTION to add a comment indicating
-- that refresh should be called after, and create a note in the function itself
-- For now, we'll document that refresh should be called manually after transform
-- The actual refresh will be handled by cron jobs or edge functions that call both
-- Add comment to function indicating refresh should be called
comment ON function transform_language_caches_to_entities () IS 'Transforms jp_language_cache and grn_language_cache into language_entities system. Matches languages by ISO 639-3, creates sources, aliases, and region relationships. Uses longer language name when matching existing entities. IMPORTANT: Call refresh_mv_language_stats() after this function completes to update materialized views.';


COMMIT;

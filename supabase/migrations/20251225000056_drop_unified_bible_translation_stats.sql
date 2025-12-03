-- 20251225000056_drop_unified_bible_translation_stats.sql
-- Drop unified_bible_translation_stats MV and refresh function
-- All dependencies have been updated to use mv_language_stats instead
BEGIN;


-- Drop the refresh function first (in case anything references it)
DROP FUNCTION if EXISTS refresh_unified_bible_stats ();


-- Drop the materialized view WITHOUT CASCADE to be safe
-- (all dependencies should already be updated)
DROP MATERIALIZED VIEW IF EXISTS unified_bible_translation_stats;


comment ON schema public IS 'unified_bible_translation_stats has been replaced by mv_language_stats which includes all Bible translation stats plus additional language statistics.';


COMMIT;

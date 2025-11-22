-- 20251225000060_add_refresh_to_people_groups_cache_sync.sql
-- Add refresh_mv_people_group_stats() call documentation to transform_jp_people_groups_cache function
BEGIN;


-- Add comment to function indicating refresh should be called
-- Note: The batch processing version already exists, we update its comment
comment ON function transform_jp_people_groups_cache (INTEGER, INTEGER) IS 'Transforms jp_people_groups_cache into canonical people_groups tables. Processes entries in batches to prevent timeouts. Insert/update only - never deletes canonical table rows. IMPORTANT: Call refresh_mv_people_group_stats() and refresh_mv_language_stats() after this function completes to update materialized views.';


COMMIT;

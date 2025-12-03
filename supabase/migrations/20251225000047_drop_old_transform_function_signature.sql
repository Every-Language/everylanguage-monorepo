-- Drop the old transform_jp_people_groups_cache function signature (no parameters)
-- The new version with batch_size and start_offset parameters replaces it
-- This migration ensures we only have one version of the function
DROP FUNCTION if EXISTS transform_jp_people_groups_cache ();


-- Also drop the old sync_jp_people_groups_canonical function if it still exists
-- (should have been replaced by transform_jp_people_groups_cache, but cleaning up just in case)
DROP FUNCTION if EXISTS sync_jp_people_groups_canonical ();

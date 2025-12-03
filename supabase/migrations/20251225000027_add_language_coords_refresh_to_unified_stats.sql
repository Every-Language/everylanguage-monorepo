-- 20251225000027_add_language_coords_refresh_to_unified_stats.sql
-- Hook language_coordinates_for_map refresh into unified_bible_translation_stats refresh
-- This ensures the materialized view stays in sync automatically when bible stats update
BEGIN;


-- Update refresh function to also refresh language_coordinates_for_map
CREATE OR REPLACE FUNCTION refresh_unified_bible_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the unique index idx_unified_stats_language which exists
  REFRESH MATERIALIZED VIEW CONCURRENTLY unified_bible_translation_stats;
  
  -- Also refresh language_coordinates_for_map to keep it in sync
  -- This materialized view depends on unified_bible_translation_stats
  PERFORM refresh_language_coordinates_map();
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the function
    -- This allows sync functions to complete even if refresh times out
    RAISE WARNING 'Failed to refresh unified_bible_translation_stats: %', SQLERRM;
    -- Re-raise if it's not a timeout (we want to know about other errors)
    IF SQLSTATE != '57014' THEN
      RAISE;
    END IF;
END;
$$ language plpgsql;


comment ON function refresh_unified_bible_stats () IS 'Refreshes unified_bible_translation_stats materialized view and automatically refreshes language_coordinates_for_map to keep it in sync. Uses CONCURRENTLY for non-blocking updates.';


COMMIT;

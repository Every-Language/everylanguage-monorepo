-- 20251225000057_create_refresh_all_stats_function.sql
-- Create combined refresh function for all stats materialized views
BEGIN;


-- Create function that refreshes all 3 MVs in sequence
CREATE OR REPLACE FUNCTION refresh_all_stats_mvs () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes per MV (15 minutes total)
  PERFORM set_config('statement_timeout', '900000', TRUE);
  
  -- Refresh mv_language_stats first (others depend on it)
  BEGIN
    PERFORM refresh_mv_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh mv_language_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh mv_region_stats (depends on mv_language_stats)
  BEGIN
    PERFORM refresh_mv_region_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh mv_region_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh mv_people_group_stats (depends on mv_language_stats)
  BEGIN
    PERFORM refresh_mv_people_group_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh mv_people_group_stats: %', SQLERRM;
      -- Continue even if this one fails
  END;
  
  -- Also refresh language_coordinates_for_map (depends on mv_language_stats)
  BEGIN
    PERFORM refresh_language_coordinates_map();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_coordinates_for_map: %', SQLERRM;
      -- Continue even if this one fails
  END;
END;
$$ language plpgsql;


comment ON function refresh_all_stats_mvs () IS 'Refreshes all stats materialized views (mv_language_stats, mv_region_stats, mv_people_group_stats) and language_coordinates_for_map in sequence. Uses CONCURRENTLY for non-blocking updates. Includes error handling to continue on timeout or other errors.';


COMMIT;

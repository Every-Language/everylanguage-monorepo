-- 20251221000003_optimize_unified_stats_refresh.sql
-- Optimize the unified_bible_translation_stats refresh function
-- 
-- Changes:
-- 1. Use REFRESH MATERIALIZED VIEW CONCURRENTLY (non-blocking, requires unique index)
-- 2. Increase timeout to 300s (5 minutes) to handle large datasets
-- 3. Add error handling for timeout scenarios
BEGIN;


-- Update the refresh function to use CONCURRENTLY and longer timeout
CREATE OR REPLACE FUNCTION refresh_unified_bible_stats () returns void AS $$
BEGIN
  -- Set timeout to 5 minutes (300 seconds) for large materialized view refresh
  PERFORM set_config('statement_timeout', '300000', TRUE);
  
  -- Use CONCURRENTLY to avoid blocking reads during refresh
  -- This requires the unique index idx_unified_stats_language which exists
  REFRESH MATERIALIZED VIEW CONCURRENTLY unified_bible_translation_stats;
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


COMMIT;

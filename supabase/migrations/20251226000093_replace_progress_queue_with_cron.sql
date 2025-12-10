-- Drop progress refresh queue system and create unified refresh system
-- Migration: 20251226000063_replace_progress_queue_with_cron.sql
-- Replaces complex queue system with simple cron-based refresh for all MVs
BEGIN;


-- ============================================================================
-- STEP 1: Drop progress refresh queue system
-- ============================================================================
-- Drop triggers (in order)
DROP TRIGGER if EXISTS enqueue_media_files ON media_files cascade;


DROP TRIGGER if EXISTS enqueue_media_files_verses ON media_files_verses cascade;


DROP TRIGGER if EXISTS enqueue_verse_texts ON verse_texts cascade;


-- Drop functions
-- Revoke privileges first, then drop (handles "dependent privileges exist" error)
DO $$
DECLARE
  func_oid OID;
BEGIN
  -- enqueue_progress_refresh
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'enqueue_progress_refresh' AND pronargs = 2;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION enqueue_progress_refresh(TEXT, UUID) FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS enqueue_progress_refresh(TEXT, UUID) CASCADE;
  END IF;
  
  -- trg_enqueue_media_files
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'trg_enqueue_media_files' AND pronargs = 0;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION trg_enqueue_media_files() FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS trg_enqueue_media_files() CASCADE;
  END IF;
  
  -- trg_enqueue_media_files_verses
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'trg_enqueue_media_files_verses' AND pronargs = 0;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION trg_enqueue_media_files_verses() FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS trg_enqueue_media_files_verses() CASCADE;
  END IF;
  
  -- trg_enqueue_verse_texts
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'trg_enqueue_verse_texts' AND pronargs = 0;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION trg_enqueue_verse_texts() FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS trg_enqueue_verse_texts() CASCADE;
  END IF;
  
  -- drain_progress_refresh_queue
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'drain_progress_refresh_queue' AND pronargs = 0;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION drain_progress_refresh_queue() FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS drain_progress_refresh_queue() CASCADE;
  END IF;
  
  -- refresh_progress_materialized_views_safe
  SELECT oid INTO func_oid FROM pg_proc WHERE proname = 'refresh_progress_materialized_views_safe' AND pronargs = 0;
  IF func_oid IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION refresh_progress_materialized_views_safe() FROM PUBLIC;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    DROP FUNCTION IF EXISTS refresh_progress_materialized_views_safe() CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- Keep refresh_progress_materialized_views_full and refresh_progress_materialized_views_concurrently
-- They will be updated below
-- Drop table
DROP TABLE IF EXISTS progress_refresh_queue cascade;


-- Drop/update cron job
-- First, unschedule the old job if it exists
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'refresh-progress-queue';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;


-- ============================================================================
-- STEP 2: Update existing refresh functions
-- ============================================================================
-- refresh_progress_materialized_views_full() - Update to refresh progress MVs only
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_full () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW audio_version_progress;
  REFRESH MATERIALIZED VIEW text_version_progress;
  -- audio_version_book_progress is now a view, not an MV, so no refresh needed
END;
$$;


comment ON function refresh_progress_materialized_views_full () IS 'Refreshes all progress materialized views (non-concurrent, blocking). Use sparingly for initial population or when concurrent refresh fails.';


-- refresh_progress_materialized_views_concurrently() - Update to refresh progress MVs only
CREATE OR REPLACE FUNCTION refresh_progress_materialized_views_concurrently () returns void language plpgsql security definer AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audio_version_progress;
  REFRESH MATERIALIZED VIEW CONCURRENTLY text_version_progress;
  -- audio_version_book_progress is now a view, not an MV, so no refresh needed
END;
$$;


comment ON function refresh_progress_materialized_views_concurrently () IS 'Refreshes all progress materialized views concurrently (non-blocking). Safe to run frequently via cron.';


-- ============================================================================
-- STEP 3: Create unified refresh function
-- ============================================================================
-- refresh_all_materialized_views() - Refreshes all MVs in dependency order
CREATE OR REPLACE FUNCTION refresh_all_materialized_views () returns void language plpgsql security definer AS $$
BEGIN
  -- Set timeout to 15 minutes total
  PERFORM set_config('statement_timeout', '900000', TRUE);
  
  -- Progress MVs: Can run in parallel (no dependencies)
  BEGIN
    PERFORM refresh_progress_materialized_views_concurrently();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh progress MVs: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Stats MVs: language_stats first, then region_stats and people_groups_stats in parallel
  BEGIN
    PERFORM refresh_language_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_stats: %', SQLERRM;
      -- Continue with other refreshes even if this one fails
  END;
  
  -- Refresh region_stats and people_groups_stats in parallel (both depend on language_stats)
  BEGIN
    PERFORM refresh_region_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh region_stats: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM refresh_people_groups_stats();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh people_groups_stats: %', SQLERRM;
  END;
  
  -- Coordinate MVs: After stats MVs (they depend on stats MVs)
  BEGIN
    PERFORM refresh_language_coordinates();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_coordinates: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM refresh_people_groups_coordinates();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh people_groups_coordinates: %', SQLERRM;
  END;
  
  -- Heatmap MV: Independent, can run anytime
  BEGIN
    -- Set timeout for heatmap refresh (5 minutes)
    PERFORM set_config('statement_timeout', '300000', TRUE);
    REFRESH MATERIALIZED VIEW CONCURRENTLY language_heatmap;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to refresh language_heatmap: %', SQLERRM;
      -- Re-raise if it's not a timeout (we want to know about other errors)
      IF SQLSTATE != '57014' THEN
        RAISE;
      END IF;
  END;
END;
$$;


comment ON function refresh_all_materialized_views () IS 'Unified function to refresh all materialized views in dependency order. Progress MVs run first (parallel), then stats MVs (language_stats first, then region_stats and people_groups_stats in parallel), then coordinate MVs, then heatmap MV. Uses CONCURRENTLY for non-blocking updates. Includes error handling to continue on individual failures. Total timeout: 15 minutes.';


-- ============================================================================
-- STEP 4: Create cron job
-- ============================================================================
-- Note: pg_cron extension is already enabled (created in earlier migration)
-- Grant necessary permissions to postgres role
GRANT usage ON schema cron TO postgres;


GRANT ALL privileges ON ALL tables IN schema cron TO postgres;


-- Schedule unified refresh job to run every 30 minutes
-- The refresh_all_materialized_views function includes error handling and is safe to run frequently
SELECT
  cron.schedule (
    'refresh-all-materialized-views', -- job name
    '*/30 * * * *', -- every 30 minutes
    'SELECT refresh_all_materialized_views();' -- call the unified refresh function
  );


comment ON extension pg_cron IS 'Schedules recurring jobs including unified materialized view refresh';


-- Note: To view job runs, query: SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- Note: To manually trigger: SELECT refresh_all_materialized_views();
-- Note: To disable job: SELECT cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname = 'refresh-all-materialized-views'), active := false);
COMMIT;

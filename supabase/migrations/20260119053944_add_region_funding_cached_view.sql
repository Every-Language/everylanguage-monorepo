-- Create a cached materialized view for region funding to improve donation flow performance
-- Uses a daily refresh via pg_cron to keep data reasonably fresh.
-- pg_cron is already enabled and configured in earlier migrations
-- Create materialized view if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_matviews
    WHERE schemaname = 'public'
      AND matviewname = 'region_funding_cached'
  ) THEN
    CREATE MATERIALIZED VIEW public.region_funding_cached AS
    SELECT
      region_id,
      region_name,
      remaining_budget_cents,
      funding_status
    FROM public.region_funding
    WHERE remaining_budget_cents > 0
      AND funding_status IN ('available', 'in_progress');
  END IF;
END $$;


-- Required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX if NOT EXISTS idx_region_funding_cached_region_id ON public.region_funding_cached (region_id);


-- Additional indexes for query performance
CREATE INDEX if NOT EXISTS idx_region_funding_cached_status_budget ON public.region_funding_cached (funding_status, remaining_budget_cents DESC);


CREATE INDEX if NOT EXISTS idx_region_funding_cached_name ON public.region_funding_cached (region_name);


-- Helper to upsert a cron job for refreshing the materialized view
CREATE OR REPLACE FUNCTION ensure_refresh_cron_job (
  job_name TEXT,
  cron_schedule TEXT,
  command_sql TEXT
) returns void AS $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = job_name;

  IF existing_job_id IS NULL THEN
    PERFORM cron.schedule(job_name, cron_schedule, command_sql);
  ELSE
    PERFORM cron.alter_job(
      job_id := existing_job_id,
      schedule := cron_schedule,
      command := command_sql
    );
  END IF;
END;
$$ language plpgsql;


-- Refresh daily at 03:00 UTC
SELECT
  ensure_refresh_cron_job (
    'refresh-region-funding-cached-daily',
    '0 3 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY public.region_funding_cached;'
  );


DROP FUNCTION ensure_refresh_cron_job (TEXT, TEXT, TEXT);


-- Note: To view job runs, query:
-- select * from cron.job_run_details order by start_time desc limit 10;

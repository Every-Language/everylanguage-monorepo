-- Setup cron job to refresh progress materialized views
-- This replaces the refresh-progress Edge Function by calling the database function directly
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION if NOT EXISTS pg_cron;


-- Grant necessary permissions to postgres role
GRANT usage ON schema cron TO postgres;


GRANT ALL privileges ON ALL tables IN schema cron TO postgres;


-- Schedule the progress refresh job to run every 15 minutes
-- The drain_progress_refresh_queue function is idempotent and safe to run frequently
SELECT
  cron.schedule (
    'refresh-progress-queue', -- job name
    '*/15 * * * *', -- every 15 minutes
    'select drain_progress_refresh_queue();' -- call the existing RPC function
  );


-- Add a comment to document the job
comment ON extension pg_cron IS 'Schedules recurring jobs including progress refresh';


-- Note: To view job runs, query: select * from cron.job_run_details order by start_time desc limit 10;
-- Note: To manually trigger: select drain_progress_refresh_queue();
-- Note: To disable job: select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'refresh-progress-queue'), active := false);

-- Update cron job to use batch processing with reasonable page limits
-- This prevents timeout issues by processing in smaller batches
BEGIN;


-- Helper to upsert a pg_cron job that invokes an Edge Function over HTTP with body
CREATE OR REPLACE FUNCTION ensure_http_cron_job_with_body (
  job_name TEXT,
  cron_schedule TEXT,
  function_path TEXT,
  request_body JSONB
) returns void AS $$
DECLARE
  existing_job_id BIGINT;
  command_sql TEXT := format($body$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body := %L::jsonb
    );
  $body$, function_path, request_body::text);
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


-- Update cache sync cron to use batch processing (50 pages per run)
-- This will sync ~12,500 records per week, completing full sync over several weeks
-- Or can be run manually more frequently for faster completion
SELECT
  ensure_http_cron_job_with_body (
    'sync_jp_people_groups_cache_weekly',
    '0 3 * * 0',
    '/functions/v1/sync-jp-people-groups-cache',
    '{"maxPages": 50}'::JSONB
  );


-- Clean up helper function
DROP FUNCTION ensure_http_cron_job_with_body (TEXT, TEXT, TEXT, JSONB);


COMMIT;

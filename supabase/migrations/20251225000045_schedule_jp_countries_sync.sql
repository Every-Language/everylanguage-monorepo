-- 20251225000045_schedule_jp_countries_sync.sql
-- Schedule weekly sync jobs for Joshua Project countries integration
BEGIN;


-- Helper to upsert a pg_cron job that invokes an Edge Function over HTTP
CREATE OR REPLACE FUNCTION ensure_http_cron_job (
  job_name TEXT,
  cron_schedule TEXT,
  function_path TEXT
) returns void AS $$
DECLARE
  existing_job_id BIGINT;
  command_sql TEXT := format($body$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      )
    );
  $body$, function_path);
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


-- Schedule cache sync (edge function) - Sunday 3:30am
SELECT
  ensure_http_cron_job (
    'sync_jp_countries_cache_weekly',
    '30 3 * * 0',
    '/functions/v1/sync-jp-countries'
  );


-- Schedule canonical sync (RPC function) - Sunday 4:30am
-- Note: pg_cron extension should already exist from previous migrations
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  -- Check if job already exists
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'sync-jp-countries-canonical-weekly';

  IF v_job_id IS NULL THEN
    -- Create new job
    PERFORM cron.schedule(
      'sync-jp-countries-canonical-weekly',
      '30 4 * * 0',
      'SELECT transform_jp_countries_cache_to_regions();'
    );
  ELSE
    -- Update existing job
    PERFORM cron.alter_job(
      job_id := v_job_id,
      schedule := '30 4 * * 0',
      command := 'SELECT transform_jp_countries_cache_to_regions();'
    );
  END IF;
END $$;


-- Clean up helper function
DROP FUNCTION ensure_http_cron_job (TEXT, TEXT, TEXT);


COMMIT;

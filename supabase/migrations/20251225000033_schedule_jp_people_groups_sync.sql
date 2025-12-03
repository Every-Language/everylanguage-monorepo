-- 20251226000004_schedule_jp_people_groups_sync.sql
-- Schedule weekly sync jobs for Joshua Project people groups integration
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


-- Schedule cache sync (edge function) - Sunday 3am
SELECT
  ensure_http_cron_job (
    'sync_jp_people_groups_cache_weekly',
    '0 3 * * 0',
    '/functions/v1/sync-jp-people-groups-cache'
  );


-- Schedule canonical sync (RPC function) - Sunday 4am
-- Note: pg_cron extension should already exist from previous migrations (20251115000000_setup_progress_refresh_cron.sql)
-- Schedule the canonical sync job to run weekly (Sunday 4am)
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  -- Check if job already exists
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'sync-jp-people-groups-canonical-weekly';

  IF v_job_id IS NULL THEN
    -- Create new job
    PERFORM cron.schedule(
      'sync-jp-people-groups-canonical-weekly',
      '0 4 * * 0',
      'SELECT sync_jp_people_groups_canonical();'
    );
  ELSE
    -- Update existing job
    PERFORM cron.alter_job(
      job_id := v_job_id,
      schedule := '0 4 * * 0',
      command := 'SELECT sync_jp_people_groups_canonical();'
    );
  END IF;
END $$;


-- Clean up helper function
DROP FUNCTION ensure_http_cron_job (TEXT, TEXT, TEXT);


COMMIT;

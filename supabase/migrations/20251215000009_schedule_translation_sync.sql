-- Schedules weekly sync jobs for Joshua Project and GRN integrations.
-- Requires the following secrets to be stored in Supabase Vault:
--   project_url - your Supabase project URL (e.g. https://xyzcompany.supabase.co)
--   anon_key    - the anon/public API key used for invoking Edge Functions
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


SELECT
  ensure_http_cron_job (
    'sync_jp_languages_weekly',
    '0 1 * * 0',
    '/functions/v1/sync-jp-languages'
  );


SELECT
  ensure_http_cron_job (
    'sync_grn_languages_weekly',
    '0 2 * * 0',
    '/functions/v1/sync-grn-languages'
  );


DROP FUNCTION ensure_http_cron_job (TEXT, TEXT, TEXT);

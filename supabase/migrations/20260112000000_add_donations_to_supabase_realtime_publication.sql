-- Ensure `public.donations` emits Postgres changes for Supabase Realtime (local + deployed)
-- Without this, `postgres_changes` subscriptions for donations won't receive UPDATE events.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_publication_tables
    WHERE
      pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'donations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
  END IF;
END $$;

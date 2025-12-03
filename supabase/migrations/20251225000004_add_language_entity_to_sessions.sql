-- Add language_entity_id to sessions table
-- Language entity ID from session, used for heatmap language distribution.
-- Nullable as sessions may not have language context initially.
-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'language_entity_id'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN language_entity_id UUID;
  END IF;
END $$;


-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_language_entity_id_fkey'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_language_entity_id_fkey FOREIGN KEY (language_entity_id)
      REFERENCES public.language_entities(id) ON DELETE SET NULL;
  END IF;
END $$;


-- Add index for join performance if it doesn't exist
CREATE INDEX if NOT EXISTS idx_sessions_language_entity_id ON public.sessions (language_entity_id)
WHERE
  language_entity_id IS NOT NULL;


-- Add comment
comment ON COLUMN public.sessions.language_entity_id IS 'Language entity ID from session, used for heatmap language distribution. Nullable as sessions may not have language context initially.';

-- 20250115000005_add_project_updates_visibility.sql
-- Adds visibility metadata to project updates and a public read policy
BEGIN;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'update_visibility'
  ) THEN
    CREATE TYPE update_visibility AS ENUM ('private', 'project', 'public');
  END IF;
END;
$$;


ALTER TABLE project_updates
ADD COLUMN IF NOT EXISTS visibility update_visibility NOT NULL DEFAULT 'project';


UPDATE project_updates
SET
  visibility = COALESCE(visibility, 'project');


CREATE INDEX if NOT EXISTS idx_project_updates_visibility ON project_updates (visibility)
WHERE
  deleted_at IS NULL;


DROP POLICY if EXISTS "Anyone can view public project updates" ON project_updates;


CREATE POLICY "Anyone can view public project updates" ON project_updates FOR
SELECT
  USING (
    visibility = 'public'
    AND deleted_at IS NULL
  );


COMMIT;

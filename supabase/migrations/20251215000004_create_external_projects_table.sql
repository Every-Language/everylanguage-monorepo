-- 20250115000004_create_external_projects_table.sql
-- Adds manual override storage for Every Language projects tracked externally
BEGIN;


CREATE TABLE external_projects_overrides (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID NOT NULL REFERENCES language_entities (id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  is_audio BOOLEAN NOT NULL DEFAULT FALSE,
  is_text BOOLEAN NOT NULL DEFAULT FALSE,
  total_chapters INTEGER NOT NULL CHECK (total_chapters >= 0),
  completed_chapters INTEGER NOT NULL DEFAULT 0 CHECK (completed_chapters >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date date,
  completion_date date,
  partner_organization TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (language_entity_id, project_name)
);


ALTER TABLE external_projects_overrides
ADD CONSTRAINT completed_not_exceed_total CHECK (completed_chapters <= total_chapters);


CREATE INDEX idx_external_projects_language ON external_projects_overrides (language_entity_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX idx_external_projects_active ON external_projects_overrides (is_active)
WHERE
  deleted_at IS NULL;


CREATE INDEX idx_external_projects_completion ON external_projects_overrides (completed_chapters)
WHERE
  deleted_at IS NULL;


COMMIT;

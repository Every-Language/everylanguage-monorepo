-- 20250115000001_create_bible_override_tables.sql
-- Adds manual override storage for Bible translation coverage
BEGIN;


CREATE TYPE scripture_coverage AS ENUM('none', 'portions', 'ot', 'nt', 'full_bible');


CREATE TABLE bible_translation_overrides (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID NOT NULL REFERENCES language_entities (id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  is_audio BOOLEAN NOT NULL DEFAULT FALSE,
  is_text BOOLEAN NOT NULL DEFAULT FALSE,
  coverage scripture_coverage NOT NULL DEFAULT 'portions',
  ot_books_completed INTEGER DEFAULT 0 CHECK (ot_books_completed BETWEEN 0 AND 39),
  nt_books_completed INTEGER DEFAULT 0 CHECK (nt_books_completed BETWEEN 0 AND 27),
  source TEXT DEFAULT 'manual',
  external_url TEXT,
  year_completed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (
    language_entity_id,
    version_name,
    is_audio,
    is_text
  )
);


CREATE INDEX idx_bible_overrides_language ON bible_translation_overrides (language_entity_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX idx_bible_overrides_coverage ON bible_translation_overrides (coverage)
WHERE
  deleted_at IS NULL;


COMMIT;

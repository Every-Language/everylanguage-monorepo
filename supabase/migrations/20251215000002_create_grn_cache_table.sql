-- 20250115000002_create_grn_cache_table.sql
-- Stores cached responses from GRN API feeds
BEGIN;


CREATE TABLE grn_language_cache (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  grn_language_id INTEGER NOT NULL,
  iso639_3 TEXT,
  language_name TEXT NOT NULL,
  has_recordings BOOLEAN NOT NULL DEFAULT FALSE,
  program_count INTEGER DEFAULT 0,
  parent_id INTEGER,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grn_language_id)
);


CREATE INDEX idx_grn_cache_iso639 ON grn_language_cache (iso639_3)
WHERE
  iso639_3 IS NOT NULL;


CREATE INDEX idx_grn_cache_has_recordings ON grn_language_cache (has_recordings)
WHERE
  has_recordings = TRUE;


CREATE INDEX idx_grn_cache_synced ON grn_language_cache (last_synced_at);


COMMIT;

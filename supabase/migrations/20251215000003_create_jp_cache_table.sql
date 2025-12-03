-- 20250115000003_create_jp_cache_table.sql
-- Stores cached Bible translation metadata from Joshua Project API
BEGIN;


CREATE TABLE jp_language_cache (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  iso639_3 TEXT NOT NULL,
  language_name TEXT NOT NULL,
  bible_status INTEGER,
  bible_year TEXT,
  nt_year TEXT,
  portions_year TEXT,
  has_audio_recordings BOOLEAN NOT NULL DEFAULT FALSE,
  grn_url TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (iso639_3)
);


CREATE INDEX idx_jp_cache_iso639 ON jp_language_cache (iso639_3);


CREATE INDEX idx_jp_cache_bible_status ON jp_language_cache (bible_status)
WHERE
  bible_status IS NOT NULL;


CREATE INDEX idx_jp_cache_synced ON jp_language_cache (last_synced_at);


COMMIT;

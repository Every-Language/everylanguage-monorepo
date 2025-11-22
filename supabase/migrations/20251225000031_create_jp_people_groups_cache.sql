-- 20251226000002_create_jp_people_groups_cache.sql
-- Cache table for Joshua Project people groups API data (PGIC - People Groups in Countries)
BEGIN;


CREATE TABLE jp_people_groups_cache (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Core IDs
  people_id3 INTEGER NOT NULL,
  people_id3_rog3 TEXT NOT NULL UNIQUE,
  rog3 TEXT,
  iso3 TEXT,
  rog2 TEXT,
  rop3 TEXT,
  rop2 TEXT,
  rop25 TEXT,
  -- Names
  peop_name_in_country TEXT,
  peop_name_across_countries TEXT,
  -- Location
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  -- Language
  rol3 TEXT,
  primary_language_name TEXT,
  primary_language_dialect TEXT,
  number_languages_spoken INTEGER,
  -- Demographics
  population INTEGER,
  population_pgac INTEGER,
  population_percent_un DOUBLE PRECISION,
  -- Religion
  primary_religion TEXT,
  rlg3 TEXT,
  pc_evangelical DOUBLE PRECISION,
  pc_christian_pc DOUBLE PRECISION,
  pc_christian_pd DOUBLE PRECISION,
  -- Status
  jpscale INTEGER,
  jpscale_text TEXT,
  jpscale_pctxt TEXT,
  jpscale_pcimg TEXT,
  least_reached TEXT,
  least_reached_basis TEXT,
  frontier TEXT,
  unengaged TEXT,
  -- Bible/Translation
  bible_status INTEGER,
  bible_year TEXT,
  nt_year TEXT,
  portions_year TEXT,
  translation_need_year INTEGER,
  translation_need_questionable TEXT,
  bible_translation_need TEXT,
  -- Resources
  has_audio_recordings TEXT,
  audio_recordings TEXT,
  audio_scripture TEXT,
  has_jesus_film TEXT,
  jf TEXT,
  jf_lang TEXT,
  jf_primary_text TEXT,
  grn TEXT,
  grn_lang TEXT,
  four_laws TEXT,
  god_story TEXT,
  gospel_radio TEXT,
  -- Geography
  region_code TEXT,
  region_name TEXT,
  continent_code TEXT,
  continent_name TEXT,
  window_status TEXT,
  location_in_country TEXT,
  ctry TEXT,
  -- Classification
  affinity_bloc TEXT,
  people_cluster TEXT,
  race_code TEXT,
  race_name TEXT,
  map_id TEXT,
  security_level INTEGER,
  -- URLs and Media
  image_url TEXT,
  photo_address TEXT,
  photo_credits TEXT,
  people_group_url TEXT,
  people_group_photo_url TEXT,
  country_url TEXT,
  jpscale_image_url TEXT,
  -- Additional fields
  profile_text_exists TEXT,
  summary TEXT,
  indigenous_language TEXT,
  some_medium_language TEXT,
  primary_medium_language TEXT,
  medium_type_gospel_presentation TEXT,
  -- Metadata
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Indexes
CREATE INDEX idx_jp_pg_cache_people_id3 ON jp_people_groups_cache (people_id3);


CREATE INDEX idx_jp_pg_cache_people_id3_rog3 ON jp_people_groups_cache (people_id3_rog3);


CREATE INDEX idx_jp_pg_cache_rol3 ON jp_people_groups_cache (rol3);


CREATE INDEX idx_jp_pg_cache_iso3 ON jp_people_groups_cache (iso3);


CREATE INDEX idx_jp_pg_cache_rog3 ON jp_people_groups_cache (rog3);


CREATE INDEX idx_jp_pg_cache_location ON jp_people_groups_cache USING gist (st_makepoint (longitude, latitude));


CREATE INDEX idx_jp_pg_cache_last_synced_at ON jp_people_groups_cache (last_synced_at);


COMMIT;

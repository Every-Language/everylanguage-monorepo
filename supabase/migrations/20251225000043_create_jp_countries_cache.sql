-- 20251225000043_create_jp_countries_cache.sql
-- Cache table for Joshua Project countries API data
BEGIN;


CREATE TABLE jp_countries_cache (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Core identifiers
  rog3 TEXT NOT NULL UNIQUE, -- FIPS 10-4 country code (primary identifier)
  ctry TEXT, -- Country name
  iso3 TEXT, -- ISO 3166-1 alpha-3
  iso2 TEXT, -- ISO 3166-1 alpha-2
  rog2 TEXT, -- Continent code
  -- Geography
  region_code INTEGER, -- JP region code (1-12)
  region_name TEXT, -- JP region name
  capital TEXT, -- Capital city
  -- Demographics
  population INTEGER,
  -- Religion percentages
  percent_buddhism DOUBLE PRECISION,
  percent_christianity DOUBLE PRECISION,
  percent_ethnic_religions DOUBLE PRECISION,
  percent_evangelical DOUBLE PRECISION,
  percent_hinduism DOUBLE PRECISION,
  percent_islam DOUBLE PRECISION,
  percent_non_religious DOUBLE PRECISION,
  percent_other_small DOUBLE PRECISION,
  percent_unknown DOUBLE PRECISION,
  religion_primary TEXT, -- Primary religion name
  rlg3_primary INTEGER, -- Primary religion code
  -- Bible translation stats
  bible_complete INTEGER, -- Count of languages with complete Bible
  bible_new_testament INTEGER, -- Count of languages with New Testament
  bible_portions INTEGER, -- Count of languages with portions
  translation_needed INTEGER, -- Count of languages needing translation
  translation_started INTEGER, -- Count of languages with translation started
  translation_unspecified INTEGER, -- Count of languages with unspecified status
  cnt_primary_languages INTEGER, -- Total primary languages in country
  -- People group stats
  cnt_peoples INTEGER, -- Total people groups
  cnt_peoples_lr INTEGER, -- Count of least reached people groups
  popl_peoples_lr INTEGER, -- Population in least reached groups
  popl_peoples_fpg INTEGER, -- Population in frontier people groups
  -- JP Scale
  jpscale_ctry INTEGER, -- JP Scale for country (1-5)
  jpscale_text TEXT, -- JP Scale text description
  jpscale_image_url TEXT, -- URL to JP Scale gauge image
  -- Other
  rol3_official_language TEXT, -- ISO 639-3 code of official language
  window_1040 TEXT, -- Window 10/40 status (Y/N)
  security_level INTEGER, -- Security level (0-3)
  -- Metadata
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);


-- Indexes
CREATE INDEX idx_jp_countries_cache_rog3 ON jp_countries_cache (rog3);


CREATE INDEX idx_jp_countries_cache_iso2 ON jp_countries_cache (iso2)
WHERE
  iso2 IS NOT NULL;


CREATE INDEX idx_jp_countries_cache_iso3 ON jp_countries_cache (iso3)
WHERE
  iso3 IS NOT NULL;


CREATE INDEX idx_jp_countries_cache_last_synced_at ON jp_countries_cache (last_synced_at);


COMMIT;

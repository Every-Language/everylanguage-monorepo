-- 20251225000011_create_grn_language_coordinates_cache.sql
-- Stores cached GRN language coordinate data from ArcGIS MapServer
BEGIN;


CREATE TABLE grn_language_coordinates_cache (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  grn_number INTEGER NOT NULL,
  language_name TEXT,
  iso_code TEXT,
  country_name TEXT NOT NULL,
  location geometry (point, 4326) NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grn_number, country_name)
);


CREATE INDEX idx_grn_coords_cache_location ON grn_language_coordinates_cache USING gist (location);


CREATE INDEX idx_grn_coords_cache_grn_number ON grn_language_coordinates_cache (grn_number);


CREATE INDEX idx_grn_coords_cache_country_name ON grn_language_coordinates_cache (country_name);


CREATE INDEX idx_grn_coords_cache_iso_code ON grn_language_coordinates_cache (iso_code)
WHERE
  iso_code IS NOT NULL;


CREATE INDEX idx_grn_coords_cache_synced ON grn_language_coordinates_cache (last_synced_at);


COMMIT;

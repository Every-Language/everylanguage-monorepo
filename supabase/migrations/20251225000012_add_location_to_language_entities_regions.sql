-- 20251225000012_add_location_to_language_entities_regions.sql
-- Add location columns to language_entities_regions for storing coordinate points
BEGIN;


ALTER TABLE language_entities_regions
ADD COLUMN location geometry (point, 4326);


ALTER TABLE language_entities_regions
ADD COLUMN location_source TEXT;


CREATE INDEX idx_language_entities_regions_location ON language_entities_regions USING gist (location)
WHERE
  location IS NOT NULL;


CREATE INDEX idx_language_entities_regions_location_source ON language_entities_regions (location_source)
WHERE
  location_source IS NOT NULL;


COMMIT;

-- 20251225000052_create_relationship_views.sql
-- Create 6 relationship views for filtered queries across languages, regions, and people groups
BEGIN;


-- 1. vw_languages_in_region - languages spoken in a country
CREATE OR REPLACE VIEW vw_languages_in_region AS
SELECT
  ler.region_id,
  ler.language_entity_id,
  le.name AS language_name,
  mls.iso639_3,
  mls.rolv_code,
  mls.population,
  mls.people_group_count,
  mls.country_count,
  mls.bible_status,
  mls.has_whole_bible,
  mls.has_new_testament,
  mls.has_portions,
  mls.has_audio_recordings,
  mls.has_jesus_film,
  mls.jp_scale,
  mls.percent_christian,
  mls.percent_evangelical,
  mls.primary_religion,
  mls.least_reached_population,
  mls.frontier_population,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source
FROM
  language_entities_regions ler
  JOIN language_entities le ON ler.language_entity_id = le.id
  JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_language_stats mls ON mls.language_entity_id = ler.language_entity_id
WHERE
  r.level = 'country'
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_languages_in_region IS 'Languages spoken in a country, including stats from mv_language_stats. Filter by region_id.';


-- 2. vw_people_groups_in_region - people groups in a country
CREATE OR REPLACE VIEW vw_people_groups_in_region AS
SELECT
  pgr.region_id,
  pgr.people_group_id,
  pg.name AS people_group_name,
  pg.people_id3,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population
FROM
  people_groups_regions pgr
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_people_group_stats mpg ON mpg.people_group_id = pgr.people_group_id
WHERE
  r.level = 'country'
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_people_groups_in_region IS 'People groups in a country, including stats from mv_people_group_stats. Filter by region_id.';


-- 3. vw_people_groups_by_language - people groups who speak a language
CREATE OR REPLACE VIEW vw_people_groups_by_language AS
SELECT
  lepg.language_entity_id,
  pgr.people_group_id,
  pg.name AS people_group_name,
  pg.people_id3,
  pgr.region_id,
  r.name AS region_name,
  mpg.population,
  mpg.language_count,
  mpg.country_count,
  mpg.primary_language_rol3,
  mpg.primary_language_name,
  mpg.primary_language_bible_status,
  mpg.image_url,
  mpg.jpscale,
  mpg.least_reached,
  mpg.frontier,
  mpg.primary_religion,
  mpg.percent_evangelical,
  mpg.percent_christian_pc,
  mpg.bible_status,
  mpg.has_audio_recordings,
  mpg.has_jesus_film,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population,
  lepg.is_primary
FROM
  language_entities_people_groups_regions lepg
  JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_people_group_stats mpg ON mpg.people_group_id = pgr.people_group_id
WHERE
  pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_people_groups_by_language IS 'People groups who speak a language, including stats from mv_people_group_stats. Filter by language_entity_id.';


-- 4. vw_regions_for_language - countries where a language is spoken
CREATE OR REPLACE VIEW vw_regions_for_language AS
SELECT
  ler.language_entity_id,
  ler.region_id,
  r.name AS region_name,
  mrs.iso3,
  mrs.iso2,
  mrs.rog3,
  mrs.population AS region_population,
  mrs.people_group_count AS region_people_group_count,
  mrs.language_count AS region_language_count,
  mrs.languages_no_scripture,
  mrs.languages_portions,
  mrs.languages_new_testament,
  mrs.languages_full_bible,
  mrs.percent_christianity,
  mrs.percent_islam,
  mrs.percent_buddhism,
  mrs.percent_hinduism,
  mrs.percent_ethnic_religions,
  mrs.percent_non_religious,
  mrs.percent_other_small,
  mrs.window_status,
  mrs.jpscale_ctry,
  ler.location,
  st_x (ler.location) AS longitude,
  st_y (ler.location) AS latitude,
  ler.location_source
FROM
  language_entities_regions ler
  JOIN language_entities le ON ler.language_entity_id = le.id
  JOIN regions r ON ler.region_id = r.id
  LEFT JOIN mv_region_stats mrs ON mrs.region_id = ler.region_id
WHERE
  r.level = 'country'
  AND ler.deleted_at IS NULL
  AND le.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_regions_for_language IS 'Countries where a language is spoken, including stats from mv_region_stats. Filter by language_entity_id.';


-- 5. vw_regions_for_people_group - countries containing a people group
CREATE OR REPLACE VIEW vw_regions_for_people_group AS
SELECT
  pgr.people_group_id,
  pgr.region_id,
  r.name AS region_name,
  mrs.iso3,
  mrs.iso2,
  mrs.rog3,
  mrs.population AS region_population,
  mrs.people_group_count AS region_people_group_count,
  mrs.language_count AS region_language_count,
  mrs.languages_no_scripture,
  mrs.languages_portions,
  mrs.languages_new_testament,
  mrs.languages_full_bible,
  mrs.percent_christianity,
  mrs.percent_islam,
  mrs.percent_buddhism,
  mrs.percent_hinduism,
  mrs.percent_ethnic_religions,
  mrs.percent_non_religious,
  mrs.percent_other_small,
  mrs.window_status,
  mrs.jpscale_ctry,
  pgr.longitude,
  pgr.latitude,
  pgr.location_point,
  pgr.peop_name_in_country,
  pgr.population AS instance_population
FROM
  people_groups_regions pgr
  JOIN people_groups pg ON pgr.people_group_id = pg.id
  JOIN regions r ON pgr.region_id = r.id
  LEFT JOIN mv_region_stats mrs ON mrs.region_id = pgr.region_id
WHERE
  r.level = 'country'
  AND pgr.deleted_at IS NULL
  AND pg.deleted_at IS NULL
  AND r.deleted_at IS NULL;


comment ON view vw_regions_for_people_group IS 'Countries containing a people group, including stats from mv_region_stats. Filter by people_group_id.';


-- 6. vw_languages_by_people_group - languages spoken by a people group
CREATE OR REPLACE VIEW vw_languages_by_people_group AS
SELECT
  lepg.people_group_region_id,
  pgr.people_group_id,
  lepg.language_entity_id,
  le.name AS language_name,
  mls.iso639_3,
  mls.rolv_code,
  mls.population AS language_population,
  mls.people_group_count AS language_people_group_count,
  mls.country_count AS language_country_count,
  mls.bible_status,
  mls.has_whole_bible,
  mls.has_new_testament,
  mls.has_portions,
  mls.has_audio_recordings,
  mls.has_jesus_film,
  mls.jp_scale,
  mls.percent_christian,
  mls.percent_evangelical,
  mls.primary_religion,
  mls.least_reached_population,
  mls.frontier_population,
  lepg.is_primary
FROM
  language_entities_people_groups_regions lepg
  JOIN people_groups_regions pgr ON lepg.people_group_region_id = pgr.id
  JOIN language_entities le ON lepg.language_entity_id = le.id
  LEFT JOIN mv_language_stats mls ON mls.language_entity_id = lepg.language_entity_id
WHERE
  pgr.deleted_at IS NULL
  AND le.deleted_at IS NULL;


comment ON view vw_languages_by_people_group IS 'Languages spoken by a people group, including stats from mv_language_stats. Filter by people_group_id (via people_group_region_id).';


-- Create indexes on foreign keys in junction tables for performance
-- These indexes should already exist, but we ensure they're there
CREATE INDEX if NOT EXISTS idx_language_entities_regions_region_id ON language_entities_regions (region_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_language_entities_regions_language_id ON language_entities_regions (language_entity_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_people_groups_regions_region_id ON people_groups_regions (region_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_people_groups_regions_people_group_id ON people_groups_regions (people_group_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_language_entities_people_groups_regions_language_id ON language_entities_people_groups_regions (language_entity_id);


CREATE INDEX if NOT EXISTS idx_language_entities_people_groups_regions_pgr_id ON language_entities_people_groups_regions (people_group_region_id);


COMMIT;

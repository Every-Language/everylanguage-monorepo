-- Test transform_language_caches_to_entities with seeded production data
-- This tests matching against existing language_entities and region linking

BEGIN;

-- Clear cache tables for clean test
TRUNCATE TABLE jp_language_cache CASCADE;
TRUNCATE TABLE grn_language_cache CASCADE;

-- Get some existing languages from seed data to test matching
-- Find languages that exist in seed data
WITH existing_languages AS (
  SELECT DISTINCT
    les.external_id as iso639_3,
    le.name,
    le.id as existing_entity_id
  FROM language_entity_sources les
  INNER JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.external_id_type = 'iso-639-3'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
  LIMIT 10
),
-- Get some countries with FIPS codes
countries_with_fips AS (
  SELECT DISTINCT
    rs.external_id as fips_code,
    r.name as country_name,
    r.id as region_id
  FROM region_sources rs
  INNER JOIN regions r ON rs.region_id = r.id
  WHERE rs.external_id_type = 'fips-10-4'
    AND r.level = 'country'
    AND rs.deleted_at IS NULL
    AND r.deleted_at IS NULL
  LIMIT 5
)
-- Insert JP cache data (mix of existing and new languages)
INSERT INTO jp_language_cache (
  iso639_3, language_name, bible_status, country_code, hub_country
)
SELECT 
  el.iso639_3,
  -- Use longer name for some to test name update logic
  CASE 
    WHEN el.iso639_3 = 'eng' THEN 'English Language'
    WHEN el.iso639_3 = 'spa' THEN 'Spanish Language'
    ELSE el.name
  END as language_name,
  5 as bible_status,
  cwf.fips_code,
  cwf.country_name
FROM existing_languages el
CROSS JOIN LATERAL (
  SELECT fips_code, country_name FROM countries_with_fips LIMIT 1
) cwf
LIMIT 5;

-- Insert some new languages not in seed data
WITH countries_with_fips AS (
  SELECT DISTINCT
    rs.external_id as fips_code,
    r.name as country_name,
    r.id as region_id
  FROM region_sources rs
  INNER JOIN regions r ON rs.region_id = r.id
  WHERE rs.external_id_type = 'fips-10-4'
    AND r.level = 'country'
    AND rs.deleted_at IS NULL
    AND r.deleted_at IS NULL
  LIMIT 1
)
INSERT INTO jp_language_cache (
  iso639_3, language_name, bible_status, country_code, hub_country
)
SELECT 
  'xxx' as iso639_3,
  'Test Language New' as language_name,
  3 as bible_status,
  cwf.fips_code,
  cwf.country_name
FROM countries_with_fips cwf;

-- Insert GRN cache data
-- Some match existing languages, some are new
WITH existing_languages AS (
  SELECT DISTINCT
    les.external_id as iso639_3,
    le.name,
    le.id as existing_entity_id
  FROM language_entity_sources les
  INNER JOIN language_entities le ON le.id = les.language_entity_id
  WHERE les.external_id_type = 'iso-639-3'
    AND les.deleted_at IS NULL
    AND le.deleted_at IS NULL
  LIMIT 3
)
INSERT INTO grn_language_cache (
  grn_language_id, iso639_3, language_name, has_recordings, program_count,
  alternate_names, name_ietf, ietf
)
SELECT 
  2000 + ROW_NUMBER() OVER () as grn_language_id,
  el.iso639_3,
  el.name,
  true,
  10,
  '[{"name": "Alternate Name 1", "ietf": "en-US"}, {"name": "Alternate Name 2"}]'::jsonb,
  LOWER(el.iso639_3),
  LOWER(el.iso639_3)
FROM existing_languages el
UNION ALL
-- Add a new language
SELECT 
  3000,
  'yyy',
  'New GRN Language',
  true,
  5,
  '[{"name": "New Language Alias"}]'::jsonb,
  'yyy',
  'yyy';

-- Show what we're testing with
SELECT 
  'Test Data Summary:' as section,
  (SELECT COUNT(*) FROM jp_language_cache) as jp_cache_count,
  (SELECT COUNT(*) FROM grn_language_cache) as grn_cache_count,
  (SELECT COUNT(*) FROM language_entities) as existing_language_entities,
  (SELECT COUNT(*) FROM regions WHERE level = 'country') as countries_with_regions;

-- Show JP cache entries
SELECT 
  'JP Cache Entries:' as section,
  iso639_3,
  language_name,
  country_code
FROM jp_language_cache
ORDER BY iso639_3;

-- Show GRN cache entries
SELECT 
  'GRN Cache Entries:' as section,
  grn_language_id,
  iso639_3,
  language_name
FROM grn_language_cache
ORDER BY iso639_3;

-- Run the transform function
SELECT 'Transform Function Results:' as section;
SELECT * FROM transform_language_caches_to_entities();

-- Verify results
SELECT 
  'After Transform - Summary:' as section,
  (SELECT COUNT(*) FROM language_entities) as total_language_entities,
  (SELECT COUNT(*) FROM language_entity_sources WHERE source = 'joshua_project') as jp_sources,
  (SELECT COUNT(*) FROM language_entity_sources WHERE source = 'grn') as grn_sources,
  (SELECT COUNT(*) FROM language_aliases) as total_aliases,
  (SELECT COUNT(*) FROM language_entities_regions) as region_links;

-- Check matched languages (should have both JP and GRN sources)
SELECT 
  'Matched Languages (both JP and GRN):' as check_type,
  le.name,
  STRING_AGG(DISTINCT les.source, ', ' ORDER BY les.source) as sources,
  COUNT(DISTINCT la.id) as alias_count
FROM language_entities le
INNER JOIN language_entity_sources les ON les.language_entity_id = le.id
LEFT JOIN language_aliases la ON la.language_entity_id = le.id
WHERE le.name IN (
  SELECT language_name FROM jp_language_cache
  INTERSECT
  SELECT language_name FROM grn_language_cache
)
GROUP BY le.id, le.name
ORDER BY le.name;

-- Check region links
SELECT 
  'Region Links Created:' as check_type,
  le.name as language_name,
  r.name as region_name,
  r.level as region_level
FROM language_entities le
INNER JOIN language_entities_regions ler ON ler.language_entity_id = le.id
INNER JOIN regions r ON r.id = ler.region_id
WHERE le.id IN (
  SELECT DISTINCT les.language_entity_id
  FROM language_entity_sources les
  WHERE les.source = 'joshua_project'
    AND les.deleted_at IS NULL
)
ORDER BY le.name, r.name
LIMIT 10;

-- Check new languages created
SELECT 
  'New Languages Created:' as check_type,
  le.name,
  STRING_AGG(DISTINCT les.source, ', ' ORDER BY les.source) as sources
FROM language_entities le
INNER JOIN language_entity_sources les ON les.language_entity_id = le.id
WHERE le.name IN ('Test Language New', 'New GRN Language')
GROUP BY le.id, le.name
ORDER BY le.name;

COMMIT;


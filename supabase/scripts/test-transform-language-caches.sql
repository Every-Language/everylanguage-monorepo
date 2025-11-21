-- Test script for transform_language_caches_to_entities function
-- Inserts sample data and tests the transform function

BEGIN;

-- Clear existing data for clean test
TRUNCATE TABLE language_entities CASCADE;
TRUNCATE TABLE jp_language_cache CASCADE;
TRUNCATE TABLE grn_language_cache CASCADE;

-- Insert sample JP cache data
INSERT INTO jp_language_cache (
  iso639_3, language_name, bible_status, country_code, hub_country
) VALUES
  ('eng', 'English', 5, 'US', 'United States'),
  ('spa', 'Spanish', 5, 'ES', 'Spain'),
  ('fra', 'French', 5, 'FR', 'France'),
  ('deu', 'German', 5, 'DE', 'Germany'),
  ('zho', 'Chinese', 3, 'CN', 'China');

-- Insert sample GRN cache data
-- Some languages match JP (same ISO), some are new
INSERT INTO grn_language_cache (
  grn_language_id, iso639_3, language_name, has_recordings, program_count,
  alternate_names, name_ietf, ietf
) VALUES
  -- Matches JP: English (longer name in GRN)
  (1001, 'eng', 'English Language', true, 10, 
   '[{"name": "American English", "ietf": "en-US"}, {"name": "British English", "ietf": "en-GB"}]'::jsonb,
   'en', 'en'),
  -- Matches JP: Spanish
  (1002, 'spa', 'Spanish', true, 5, 
   '[{"name": "Español", "ietf": "es"}]'::jsonb,
   'es', 'es'),
  -- New language: Portuguese
  (1003, 'por', 'Portuguese', true, 8,
   '[{"name": "Português", "ietf": "pt"}]'::jsonb,
   'pt', 'pt'),
  -- New language: Italian
  (1004, 'ita', 'Italian', true, 6,
   '[{"name": "Italiano", "ietf": "it"}]'::jsonb,
   'it', 'it');

-- Check counts before transform
SELECT 
  'Before transform:' as stage,
  (SELECT COUNT(*) FROM jp_language_cache) as jp_cache_count,
  (SELECT COUNT(*) FROM grn_language_cache) as grn_cache_count,
  (SELECT COUNT(*) FROM language_entities) as language_entities_count,
  (SELECT COUNT(*) FROM language_entity_sources) as sources_count,
  (SELECT COUNT(*) FROM language_aliases) as aliases_count,
  (SELECT COUNT(*) FROM language_entities_regions) as regions_count;

-- Run the transform function
SELECT * FROM transform_language_caches_to_entities();

-- Check counts after transform
SELECT 
  'After transform:' as stage,
  (SELECT COUNT(*) FROM language_entities) as language_entities_count,
  (SELECT COUNT(*) FROM language_entity_sources) as sources_count,
  (SELECT COUNT(*) FROM language_aliases) as aliases_count,
  (SELECT COUNT(*) FROM language_entities_regions) as regions_count;

-- Verify JP languages were created
SELECT 
  'JP Languages:' as check_type,
  le.id,
  le.name,
  les.source,
  les.external_id,
  les.external_id_type
FROM language_entities le
LEFT JOIN language_entity_sources les ON les.language_entity_id = le.id
WHERE les.source = 'joshua_project'
ORDER BY le.name;

-- Verify GRN languages were created
SELECT 
  'GRN Languages:' as check_type,
  le.id,
  le.name,
  les.source,
  les.external_id,
  les.external_id_type
FROM language_entities le
LEFT JOIN language_entity_sources les ON les.language_entity_id = le.id
WHERE les.source = 'grn'
ORDER BY le.name;

-- Verify matched languages (should have both JP and GRN sources)
SELECT 
  'Matched Languages (both JP and GRN):' as check_type,
  le.id,
  le.name,
  COUNT(DISTINCT les.source) as source_count,
  STRING_AGG(DISTINCT les.source, ', ') as sources
FROM language_entities le
INNER JOIN language_entity_sources les ON les.language_entity_id = le.id
GROUP BY le.id, le.name
HAVING COUNT(DISTINCT les.source) > 1
ORDER BY le.name;

-- Verify aliases
SELECT 
  'Aliases:' as check_type,
  le.name as language_name,
  la.alias_name
FROM language_entities le
INNER JOIN language_aliases la ON la.language_entity_id = le.id
ORDER BY le.name, la.alias_name
LIMIT 20;

-- Verify region links (JP only)
SELECT 
  'Region Links:' as check_type,
  le.name as language_name,
  r.name as region_name,
  r.level as region_level
FROM language_entities le
INNER JOIN language_entities_regions ler ON ler.language_entity_id = le.id
INNER JOIN regions r ON r.id = ler.region_id
ORDER BY le.name, r.name;

COMMIT;


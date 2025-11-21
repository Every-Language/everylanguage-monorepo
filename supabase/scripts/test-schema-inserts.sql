-- Test inserts to verify schema works correctly

-- Test JP insert with all new fields
INSERT INTO jp_language_cache (
  iso639_3,
  language_name,
  bible_status,
  bible_year,
  nt_year,
  portions_year,
  has_audio_recordings,
  grn_url,
  status,
  country_code,
  hub_country,
  translation_need_questionable,
  percent_adherents,
  percent_evangelical,
  has_jesus_film,
  jf_url,
  jp_scale,
  least_reached,
  religion_code,
  primary_religion,
  fcbh_url,
  nbr_pgics,
  nbr_countries
) VALUES (
  'test',
  'Test Language',
  5,
  '2020',
  '2010',
  'Yes',
  true,
  'https://example.com',
  'L',
  'US',
  'United States',
  false,
  50.25,
  45.75,
  true,
  'https://jf.example.com',
  5,
  false,
  '1',
  'Christianity',
  'https://fcbh.example.com',
  10,
  2
)
ON CONFLICT (iso639_3) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  status = EXCLUDED.status,
  country_code = EXCLUDED.country_code;

-- Test GRN insert with JSONB fields
INSERT INTO grn_language_cache (
  grn_language_id,
  iso639_3,
  language_name,
  has_recordings,
  program_count,
  parent_id,
  name_ietf,
  audio_sample,
  ietf,
  media_ids,
  alternate_names,
  programs
) VALUES (
  999999,
  'test',
  'Test GRN Language',
  true,
  5,
  100,
  'en',
  true,
  'test-TEST',
  '[{"org_key": 31, "code": "TEST"}]'::jsonb,
  '[{"name": "Test Language", "ietf": "en", "best": "1"}]'::jsonb,
  '[{"id": 1420, "state": 9, "title": "Test Program", "programType": 12, "tracks": 17}]'::jsonb
)
ON CONFLICT (grn_language_id) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  ietf = EXCLUDED.ietf;

-- Verify the inserts
SELECT 'JP Test Row:' as test_type, iso639_3, language_name, status, country_code, jp_scale, least_reached, percent_evangelical
FROM jp_language_cache WHERE iso639_3 = 'test'
UNION ALL
SELECT 'GRN Test Row:', iso639_3::text, language_name, ietf, NULL::text, NULL::integer, NULL::boolean, NULL::numeric
FROM grn_language_cache WHERE grn_language_id = 999999;

-- Clean up
DELETE FROM jp_language_cache WHERE iso639_3 = 'test';
DELETE FROM grn_language_cache WHERE grn_language_id = 999999;


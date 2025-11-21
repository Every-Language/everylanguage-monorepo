-- Test Data for Projects
-- This script inserts test projects with locations around the world
-- Each project has a source language and target language
-- 
-- Usage: Copy and paste this into your Supabase SQL editor
-- The script uses subqueries to get actual user_ids, language_entity_ids, and region_ids
-- from your database, so it should work regardless of what's already in there.
-- ============================================================================
-- INSERT PROJECTS
-- ============================================================================
-- Projects with locations around the world
-- Each project represents a translation/recording project from source language to target language
INSERT INTO
  public.projects (
    id,
    name,
    description,
    source_language_entity_id,
    target_language_entity_id,
    region_id,
    location,
    created_by,
    project_status,
    funding_status,
    created_at,
    updated_at
  )
VALUES
  -- Nairobi, Kenya - English to Swahili
  (
    GEN_RANDOM_UUID(),
    'Nairobi Bible Translation Project',
    'Translation project bringing the Bible to Swahili speakers in Nairobi and surrounding areas.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ), -- source: English (or first available)
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        1
    ), -- target: Swahili (or second available)
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
    ),
    st_setsrid (st_makepoint (36.8219, -1.2921), 4326), -- Nairobi, Kenya
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'active',
    'partially_funded',
    '2025-01-15 10:00:00+00'::TIMESTAMPTZ,
    '2025-11-20 14:30:00+00'::TIMESTAMPTZ
  ),
  -- Lagos, Nigeria - English to Yoruba
  (
    GEN_RANDOM_UUID(),
    'Lagos Yoruba Audio Bible',
    'Audio Bible recording project for Yoruba speakers in Lagos, Nigeria.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        2
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        1
    ),
    st_setsrid (st_makepoint (3.3792, 6.5244), 4326), -- Lagos, Nigeria
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'active',
    'fully_funded',
    '2025-02-10 09:00:00+00'::TIMESTAMPTZ,
    '2025-11-19 16:45:00+00'::TIMESTAMPTZ
  ),
  -- Mumbai, India - English to Hindi
  (
    GEN_RANDOM_UUID(),
    'Mumbai Hindi Translation Initiative',
    'Comprehensive Bible translation project for Hindi speakers in Mumbai and Maharashtra.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        3
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        2
    ),
    st_setsrid (st_makepoint (72.8777, 19.0760), 4326), -- Mumbai, India
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'active',
    'unfunded',
    '2025-03-05 11:30:00+00'::TIMESTAMPTZ,
    '2025-11-18 10:20:00+00'::TIMESTAMPTZ
  ),
  -- São Paulo, Brazil - Portuguese to Spanish
  (
    GEN_RANDOM_UUID(),
    'São Paulo Spanish Bible Project',
    'Bible translation project for Spanish-speaking communities in São Paulo.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        4
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        5
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        3
    ),
    st_setsrid (st_makepoint (-46.6333, -23.5505), 4326), -- São Paulo, Brazil
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'precreated',
    'unfunded',
    '2025-04-20 08:15:00+00'::TIMESTAMPTZ,
    '2025-11-17 12:00:00+00'::TIMESTAMPTZ
  ),
  -- Jakarta, Indonesia - English to Indonesian
  (
    GEN_RANDOM_UUID(),
    'Jakarta Indonesian Audio Bible',
    'Audio Bible recording project for Indonesian speakers in Jakarta.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        6
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        4
    ),
    st_setsrid (st_makepoint (106.8451, -6.2088), 4326), -- Jakarta, Indonesia
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'active',
    'partially_funded',
    '2025-05-12 13:45:00+00'::TIMESTAMPTZ,
    '2025-11-16 09:30:00+00'::TIMESTAMPTZ
  ),
  -- Cairo, Egypt - English to Arabic
  (
    GEN_RANDOM_UUID(),
    'Cairo Arabic Translation Project',
    'Bible translation project for Arabic speakers in Cairo and Egypt.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        7
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        5
    ),
    st_setsrid (st_makepoint (31.2357, 30.0444), 4326), -- Cairo, Egypt
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'active',
    'fully_funded',
    '2025-06-01 10:20:00+00'::TIMESTAMPTZ,
    '2025-11-15 15:10:00+00'::TIMESTAMPTZ
  ),
  -- Manila, Philippines - English to Tagalog
  (
    GEN_RANDOM_UUID(),
    'Manila Tagalog Bible Project',
    'Translation and audio recording project for Tagalog speakers in Manila.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        8
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        6
    ),
    st_setsrid (st_makepoint (120.9842, 14.5995), 4326), -- Manila, Philippines
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'active',
    'partially_funded',
    '2025-07-08 14:00:00+00'::TIMESTAMPTZ,
    '2025-11-14 11:25:00+00'::TIMESTAMPTZ
  ),
  -- Bangkok, Thailand - English to Thai
  (
    GEN_RANDOM_UUID(),
    'Bangkok Thai Audio Bible',
    'Audio Bible recording project for Thai speakers in Bangkok.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        9
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        7
    ),
    st_setsrid (st_makepoint (100.5018, 13.7563), 4326), -- Bangkok, Thailand
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'precreated',
    'unfunded',
    '2025-08-15 09:30:00+00'::TIMESTAMPTZ,
    '2025-11-13 13:40:00+00'::TIMESTAMPTZ
  ),
  -- Mexico City, Mexico - Spanish to Nahuatl
  (
    GEN_RANDOM_UUID(),
    'Mexico City Nahuatl Translation',
    'Bible translation project for Nahuatl speakers in Mexico City and surrounding areas.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        5
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        10
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        8
    ),
    st_setsrid (st_makepoint (-99.1332, 19.4326), 4326), -- Mexico City, Mexico
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'active',
    'partially_funded',
    '2025-09-10 11:15:00+00'::TIMESTAMPTZ,
    '2025-11-12 10:50:00+00'::TIMESTAMPTZ
  ),
  -- Lima, Peru - Spanish to Quechua
  (
    GEN_RANDOM_UUID(),
    'Lima Quechua Bible Project',
    'Translation project bringing the Bible to Quechua speakers in Lima and the Andes.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        5
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        11
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        9
    ),
    st_setsrid (st_makepoint (-77.0428, -12.0464), 4326), -- Lima, Peru
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'active',
    'fully_funded',
    '2025-10-05 08:45:00+00'::TIMESTAMPTZ,
    '2025-11-11 14:15:00+00'::TIMESTAMPTZ
  ),
  -- Kinshasa, DRC - French to Lingala
  (
    GEN_RANDOM_UUID(),
    'Kinshasa Lingala Audio Bible',
    'Audio Bible recording project for Lingala speakers in Kinshasa, Democratic Republic of Congo.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        12
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        13
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        10
    ),
    st_setsrid (st_makepoint (15.2663, -4.4419), 4326), -- Kinshasa, DRC
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'active',
    'unfunded',
    '2025-10-20 12:30:00+00'::TIMESTAMPTZ,
    '2025-11-10 09:00:00+00'::TIMESTAMPTZ
  ),
  -- Dhaka, Bangladesh - English to Bengali
  (
    GEN_RANDOM_UUID(),
    'Dhaka Bengali Translation Initiative',
    'Comprehensive Bible translation project for Bengali speakers in Dhaka and Bangladesh.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        14
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        11
    ),
    st_setsrid (st_makepoint (90.4125, 23.8103), 4326), -- Dhaka, Bangladesh
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'completed',
    'fully_funded',
    '2024-12-01 10:00:00+00'::TIMESTAMPTZ,
    '2025-11-09 16:30:00+00'::TIMESTAMPTZ
  ),
  -- Ho Chi Minh City, Vietnam - English to Vietnamese
  (
    GEN_RANDOM_UUID(),
    'Ho Chi Minh Vietnamese Bible',
    'Bible translation and audio recording project for Vietnamese speakers in Ho Chi Minh City.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        15
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        12
    ),
    st_setsrid (st_makepoint (106.6297, 10.8231), 4326), -- Ho Chi Minh City, Vietnam
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'active',
    'partially_funded',
    '2025-01-20 09:15:00+00'::TIMESTAMPTZ,
    '2025-11-08 11:45:00+00'::TIMESTAMPTZ
  ),
  -- Addis Ababa, Ethiopia - English to Amharic
  (
    GEN_RANDOM_UUID(),
    'Addis Ababa Amharic Translation',
    'Translation project for Amharic speakers in Addis Ababa and Ethiopia.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        16
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        13
    ),
    st_setsrid (st_makepoint (38.7469, 9.1450), 4326), -- Addis Ababa, Ethiopia
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'active',
    'fully_funded',
    '2025-02-28 13:20:00+00'::TIMESTAMPTZ,
    '2025-11-07 10:10:00+00'::TIMESTAMPTZ
  ),
  -- Karachi, Pakistan - English to Urdu
  (
    GEN_RANDOM_UUID(),
    'Karachi Urdu Bible Project',
    'Bible translation project for Urdu speakers in Karachi, Pakistan.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        17
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        14
    ),
    st_setsrid (st_makepoint (67.0011, 24.8607), 4326), -- Karachi, Pakistan
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'precreated',
    'unfunded',
    '2025-03-15 11:00:00+00'::TIMESTAMPTZ,
    '2025-11-06 14:20:00+00'::TIMESTAMPTZ
  ),
  -- Bogotá, Colombia - Spanish to Wayuu
  (
    GEN_RANDOM_UUID(),
    'Bogotá Wayuu Translation',
    'Translation project for Wayuu speakers in Bogotá and La Guajira region.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        5
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        18
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        15
    ),
    st_setsrid (st_makepoint (-74.0721, 4.7110), 4326), -- Bogotá, Colombia
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        0
    ),
    'active',
    'partially_funded',
    '2025-04-10 10:30:00+00'::TIMESTAMPTZ,
    '2025-11-05 09:15:00+00'::TIMESTAMPTZ
  ),
  -- Completed project example
  (
    GEN_RANDOM_UUID(),
    'Completed Test Project',
    'This is a completed project example for testing purposes.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        1
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
    ),
    st_setsrid (st_makepoint (-74.006, 40.7128), 4326), -- New York, USA
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        1
    ),
    'completed',
    'fully_funded',
    '2024-01-01 08:00:00+00'::TIMESTAMPTZ,
    '2025-06-30 17:00:00+00'::TIMESTAMPTZ
  ),
  -- Cancelled project example
  (
    GEN_RANDOM_UUID(),
    'Cancelled Test Project',
    'This is a cancelled project example for testing purposes.',
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        0
    ),
    (
      SELECT
        id
      FROM
        public.language_entities
      LIMIT
        1
      OFFSET
        2
    ),
    (
      SELECT
        id
      FROM
        public.regions
      WHERE
        deleted_at IS NULL
      LIMIT
        1
      OFFSET
        1
    ),
    st_setsrid (st_makepoint (-0.1276, 51.5074), 4326), -- London, UK
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        2
    ),
    'cancelled',
    'unfunded',
    '2024-06-15 10:00:00+00'::TIMESTAMPTZ,
    '2024-12-01 12:00:00+00'::TIMESTAMPTZ
  );


-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify)
-- ============================================================================
-- Check how many projects were created
-- SELECT COUNT(*) as project_count FROM public.projects WHERE created_at >= '2024-01-01'::timestamptz;
-- Check projects by status
-- SELECT project_status, COUNT(*) as count FROM public.projects GROUP BY project_status;
-- Check projects by funding status
-- SELECT funding_status, COUNT(*) as count FROM public.projects GROUP BY funding_status;
-- Check projects by location
-- SELECT 
--   ST_X(location) as lon,
--   ST_Y(location) as lat,
--   name,
--   project_status,
--   funding_status,
--   created_at
-- FROM public.projects
-- WHERE location IS NOT NULL
-- ORDER BY created_at DESC;

-- Additional Test Data for Projects
-- This script inserts more test projects with locations around the world
-- Each project has a source language and target language
-- 
-- Usage: Copy and paste this into your Supabase SQL editor
-- The script uses subqueries to get actual user_ids, language_entity_ids, and region_ids
-- from your database, so it should work regardless of what's already in there.
-- ============================================================================
-- INSERT ADDITIONAL PROJECTS
-- ============================================================================
-- More projects with locations around the world
-- Focus on different regions and language pairs
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
  -- Accra, Ghana - English to Twi
  (
    GEN_RANDOM_UUID(),
    'Accra Twi Bible Translation',
    'Bible translation project for Twi speakers in Accra and the Ashanti region.',
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
    st_setsrid (st_makepoint (-0.1866, 5.6037), 4326), -- Accra, Ghana
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
    '2025-01-25 10:30:00+00'::TIMESTAMPTZ,
    '2025-11-21 08:00:00+00'::TIMESTAMPTZ
  ),
  -- Kampala, Uganda - English to Luganda
  (
    GEN_RANDOM_UUID(),
    'Kampala Luganda Audio Bible',
    'Audio Bible recording project for Luganda speakers in Kampala, Uganda.',
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
    st_setsrid (st_makepoint (32.5822, 0.3476), 4326), -- Kampala, Uganda
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
    '2025-02-15 09:15:00+00'::TIMESTAMPTZ,
    '2025-11-20 15:30:00+00'::TIMESTAMPTZ
  ),
  -- Dar es Salaam, Tanzania - English to Swahili
  (
    GEN_RANDOM_UUID(),
    'Dar es Salaam Swahili Project',
    'Translation and audio recording project for Swahili speakers in Dar es Salaam.',
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
      OFFSET
        2
    ),
    st_setsrid (st_makepoint (39.2083, -6.7924), 4326), -- Dar es Salaam, Tanzania
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
    '2025-03-10 11:00:00+00'::TIMESTAMPTZ,
    '2025-11-19 12:45:00+00'::TIMESTAMPTZ
  ),
  -- Dakar, Senegal - French to Wolof
  (
    GEN_RANDOM_UUID(),
    'Dakar Wolof Translation Initiative',
    'Bible translation project for Wolof speakers in Dakar and Senegal.',
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
        3
    ),
    st_setsrid (st_makepoint (-17.4677, 14.7167), 4326), -- Dakar, Senegal
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
    '2025-04-05 08:45:00+00'::TIMESTAMPTZ,
    '2025-11-18 10:20:00+00'::TIMESTAMPTZ
  ),
  -- Luanda, Angola - Portuguese to Kimbundu
  (
    GEN_RANDOM_UUID(),
    'Luanda Kimbundu Bible Project',
    'Translation project for Kimbundu speakers in Luanda, Angola.',
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
        4
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
    st_setsrid (st_makepoint (13.2344, -8.8383), 4326), -- Luanda, Angola
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
    '2025-05-20 13:20:00+00'::TIMESTAMPTZ,
    '2025-11-17 14:10:00+00'::TIMESTAMPTZ
  ),
  -- Chennai, India - English to Tamil
  (
    GEN_RANDOM_UUID(),
    'Chennai Tamil Audio Bible',
    'Audio Bible recording project for Tamil speakers in Chennai, India.',
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
        5
    ),
    st_setsrid (st_makepoint (80.2707, 13.0827), 4326), -- Chennai, India
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
    '2025-06-12 10:00:00+00'::TIMESTAMPTZ,
    '2025-11-16 11:30:00+00'::TIMESTAMPTZ
  ),
  -- Kolkata, India - English to Bengali
  (
    GEN_RANDOM_UUID(),
    'Kolkata Bengali Translation',
    'Bible translation project for Bengali speakers in Kolkata, West Bengal.',
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
        6
    ),
    st_setsrid (st_makepoint (88.3639, 22.5726), 4326), -- Kolkata, India
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
    '2025-07-08 09:30:00+00'::TIMESTAMPTZ,
    '2025-11-15 13:00:00+00'::TIMESTAMPTZ
  ),
  -- Bangalore, India - English to Kannada
  (
    GEN_RANDOM_UUID(),
    'Bangalore Kannada Bible Project',
    'Translation and audio recording project for Kannada speakers in Bangalore.',
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
        7
    ),
    st_setsrid (st_makepoint (77.5946, 12.9716), 4326), -- Bangalore, India
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
    '2025-08-15 11:15:00+00'::TIMESTAMPTZ,
    '2025-11-14 09:45:00+00'::TIMESTAMPTZ
  ),
  -- Medellín, Colombia - Spanish to Emberá
  (
    GEN_RANDOM_UUID(),
    'Medellín Emberá Translation',
    'Translation project for Emberá speakers in Medellín and Antioquia region.',
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
        8
    ),
    st_setsrid (st_makepoint (-75.5636, 6.2476), 4326), -- Medellín, Colombia
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
    '2025-09-05 10:45:00+00'::TIMESTAMPTZ,
    '2025-11-13 12:20:00+00'::TIMESTAMPTZ
  ),
  -- Buenos Aires, Argentina - Spanish to Guarani
  (
    GEN_RANDOM_UUID(),
    'Buenos Aires Guarani Bible',
    'Bible translation project for Guarani speakers in Buenos Aires and northern Argentina.',
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
        9
    ),
    st_setsrid (st_makepoint (-58.3816, -34.6037), 4326), -- Buenos Aires, Argentina
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
    '2025-10-10 08:30:00+00'::TIMESTAMPTZ,
    '2025-11-12 15:15:00+00'::TIMESTAMPTZ
  ),
  -- Kuala Lumpur, Malaysia - English to Malay
  (
    GEN_RANDOM_UUID(),
    'Kuala Lumpur Malay Translation',
    'Translation project for Malay speakers in Kuala Lumpur, Malaysia.',
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
        10
    ),
    st_setsrid (st_makepoint (101.6869, 3.1390), 4326), -- Kuala Lumpur, Malaysia
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
    '2025-01-30 12:00:00+00'::TIMESTAMPTZ,
    '2025-11-11 10:00:00+00'::TIMESTAMPTZ
  ),
  -- Yangon, Myanmar - English to Burmese
  (
    GEN_RANDOM_UUID(),
    'Yangon Burmese Audio Bible',
    'Audio Bible recording project for Burmese speakers in Yangon, Myanmar.',
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
        11
    ),
    st_setsrid (st_makepoint (96.1561, 16.8661), 4326), -- Yangon, Myanmar
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
    '2025-02-20 09:45:00+00'::TIMESTAMPTZ,
    '2025-11-10 14:30:00+00'::TIMESTAMPTZ
  ),
  -- Phnom Penh, Cambodia - English to Khmer
  (
    GEN_RANDOM_UUID(),
    'Phnom Penh Khmer Translation',
    'Bible translation project for Khmer speakers in Phnom Penh, Cambodia.',
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
        12
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
    st_setsrid (st_makepoint (104.9160, 11.5564), 4326), -- Phnom Penh, Cambodia
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
    '2025-03-25 11:30:00+00'::TIMESTAMPTZ,
    '2025-11-09 09:20:00+00'::TIMESTAMPTZ
  ),
  -- Vientiane, Laos - English to Lao
  (
    GEN_RANDOM_UUID(),
    'Vientiane Lao Bible Project',
    'Translation and audio recording project for Lao speakers in Vientiane, Laos.',
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
        13
    ),
    st_setsrid (st_makepoint (102.6331, 17.9757), 4326), -- Vientiane, Laos
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
    '2025-04-18 10:15:00+00'::TIMESTAMPTZ,
    '2025-11-08 13:45:00+00'::TIMESTAMPTZ
  ),
  -- Kathmandu, Nepal - English to Nepali
  (
    GEN_RANDOM_UUID(),
    'Kathmandu Nepali Translation',
    'Bible translation project for Nepali speakers in Kathmandu, Nepal.',
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
        14
    ),
    st_setsrid (st_makepoint (85.3240, 27.7172), 4326), -- Kathmandu, Nepal
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
    '2025-05-22 08:00:00+00'::TIMESTAMPTZ,
    '2025-11-07 11:10:00+00'::TIMESTAMPTZ
  ),
  -- Colombo, Sri Lanka - English to Sinhala
  (
    GEN_RANDOM_UUID(),
    'Colombo Sinhala Audio Bible',
    'Audio Bible recording project for Sinhala speakers in Colombo, Sri Lanka.',
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
        15
    ),
    st_setsrid (st_makepoint (79.8612, 6.9271), 4326), -- Colombo, Sri Lanka
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
    '2025-06-14 12:30:00+00'::TIMESTAMPTZ,
    '2025-11-06 10:40:00+00'::TIMESTAMPTZ
  ),
  -- Port-au-Prince, Haiti - French to Haitian Creole
  (
    GEN_RANDOM_UUID(),
    'Port-au-Prince Haitian Creole Bible',
    'Translation project for Haitian Creole speakers in Port-au-Prince, Haiti.',
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
        16
    ),
    st_setsrid (st_makepoint (-72.3350, 18.5944), 4326), -- Port-au-Prince, Haiti
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
    '2025-07-20 09:15:00+00'::TIMESTAMPTZ,
    '2025-11-05 14:20:00+00'::TIMESTAMPTZ
  ),
  -- Santo Domingo, Dominican Republic - Spanish to Dominican Spanish
  (
    GEN_RANDOM_UUID(),
    'Santo Domingo Audio Bible Project',
    'Audio Bible recording project for Dominican Spanish speakers in Santo Domingo.',
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
        17
    ),
    st_setsrid (st_makepoint (-69.9312, 18.4861), 4326), -- Santo Domingo, Dominican Republic
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
    '2025-08-25 11:00:00+00'::TIMESTAMPTZ,
    '2025-11-04 09:30:00+00'::TIMESTAMPTZ
  ),
  -- Caracas, Venezuela - Spanish to Wayuu
  (
    GEN_RANDOM_UUID(),
    'Caracas Wayuu Translation Initiative',
    'Translation project for Wayuu speakers in Caracas and Zulia region, Venezuela.',
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
        18
    ),
    st_setsrid (st_makepoint (-66.9036, 10.4806), 4326), -- Caracas, Venezuela
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
    '2025-09-18 10:30:00+00'::TIMESTAMPTZ,
    '2025-11-03 12:15:00+00'::TIMESTAMPTZ
  ),
  -- Quito, Ecuador - Spanish to Kichwa
  (
    GEN_RANDOM_UUID(),
    'Quito Kichwa Bible Project',
    'Bible translation project for Kichwa speakers in Quito and the Ecuadorian Andes.',
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
        19
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
        19
    ),
    st_setsrid (st_makepoint (-78.4678, -0.1807), 4326), -- Quito, Ecuador
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
    '2025-10-12 08:45:00+00'::TIMESTAMPTZ,
    '2025-11-02 15:00:00+00'::TIMESTAMPTZ
  ),
  -- Completed project - recent completion
  (
    GEN_RANDOM_UUID(),
    'Recently Completed Project',
    'A project that was recently completed, demonstrating the completed status.',
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
    st_setsrid (st_makepoint (139.6503, 35.6762), 4326), -- Tokyo, Japan
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
    '2024-08-01 09:00:00+00'::TIMESTAMPTZ,
    '2025-10-31 16:00:00+00'::TIMESTAMPTZ
  ),
  -- Precreated project - planning stage
  (
    GEN_RANDOM_UUID(),
    'Planning Stage Project',
    'A project in the precreated/planning stage, not yet active.',
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
    st_setsrid (st_makepoint (151.2093, -33.8688), 4326), -- Sydney, Australia
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
    '2025-11-01 10:00:00+00'::TIMESTAMPTZ,
    '2025-11-01 10:00:00+00'::TIMESTAMPTZ
  );


-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify)
-- ============================================================================
-- Check total project count
-- SELECT COUNT(*) as total_projects FROM public.projects;
-- Check projects by status
-- SELECT project_status, COUNT(*) as count FROM public.projects GROUP BY project_status ORDER BY count DESC;
-- Check projects by funding status
-- SELECT funding_status, COUNT(*) as count FROM public.projects GROUP BY funding_status ORDER BY count DESC;
-- Check projects by region (if region_id is populated)
-- SELECT 
--   r.name as region_name,
--   COUNT(p.id) as project_count
-- FROM public.projects p
-- LEFT JOIN public.regions r ON p.region_id = r.id
-- WHERE p.deleted_at IS NULL
-- GROUP BY r.name
-- ORDER BY project_count DESC;
-- Check projects with locations
-- SELECT 
--   name,
--   project_status,
--   funding_status,
--   ST_X(location) as longitude,
--   ST_Y(location) as latitude,
--   created_at
-- FROM public.projects
-- WHERE location IS NOT NULL
--   AND deleted_at IS NULL
-- ORDER BY created_at DESC
-- LIMIT 25;

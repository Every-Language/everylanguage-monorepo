-- Bulk Test Data for Global Sessions Heatmap
-- This script inserts many sessions and chapter_listens to populate heatmap with hundreds of sessions per grid cell
-- Date: November 21, 2025 around 8am
-- 
-- Usage: Copy and paste this into your Supabase SQL editor
-- This generates many more sessions than the initial test data file
-- ============================================================================
-- INSERT BULK SESSIONS
-- ============================================================================
-- Generate many sessions per location to create dense heatmap data
-- Using generate_series to create multiple sessions per city
-- New York, USA - Generate 150 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      -74.006 + (RANDOM() - 0.5) * 0.1,
      40.7128 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ), -- Slight variation in location
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'NA',
  'US',
  'NY'
FROM
  GENERATE_SERIES(1, 150);


-- London, UK - Generate 120 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      -0.1276 + (RANDOM() - 0.5) * 0.1,
      51.5074 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'EU',
  'GB',
  NULL
FROM
  GENERATE_SERIES(1, 120);


-- Tokyo, Japan - Generate 200 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      139.6503 + (RANDOM() - 0.5) * 0.1,
      35.6762 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'AS',
  'JP',
  NULL
FROM
  GENERATE_SERIES(1, 200);


-- Sydney, Australia - Generate 100 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      151.2093 + (RANDOM() - 0.5) * 0.1,
      -33.8688 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'OC',
  'AU',
  'NSW'
FROM
  GENERATE_SERIES(1, 100);


-- São Paulo, Brazil - Generate 180 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      -46.6333 + (RANDOM() - 0.5) * 0.1,
      -23.5505 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'device'
    WHEN 1 THEN 'ip'
    ELSE 'device'
  END::location_source_type,
  'SA',
  'BR',
  NULL
FROM
  GENERATE_SERIES(1, 180);


-- Lagos, Nigeria - Generate 140 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      3.3792 + (RANDOM() - 0.5) * 0.1,
      6.5244 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'AF',
  'NG',
  NULL
FROM
  GENERATE_SERIES(1, 140);


-- Mumbai, India - Generate 220 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      72.8777 + (RANDOM() - 0.5) * 0.1,
      19.0760 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'AS',
  'IN',
  'MH'
FROM
  GENERATE_SERIES(1, 220);


-- Beijing, China - Generate 190 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      116.4074 + (RANDOM() - 0.5) * 0.1,
      39.9042 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'AS',
  'CN',
  NULL
FROM
  GENERATE_SERIES(1, 190);


-- Cairo, Egypt - Generate 110 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      31.2357 + (RANDOM() - 0.5) * 0.1,
      30.0444 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'AF',
  'EG',
  NULL
FROM
  GENERATE_SERIES(1, 110);


-- Mexico City, Mexico - Generate 160 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes'),
  st_setsrid (
    st_makepoint (
      -99.1332 + (RANDOM() - 0.5) * 0.1,
      19.4326 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'NA',
  'MX',
  NULL
FROM
  GENERATE_SERIES(1, 160);


-- San Francisco, USA - Generate 130 sessions (some active)
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  CASE
    WHEN (generate_series % 10) = 0 THEN NULL
    ELSE '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes')
  END, -- 10% active sessions
  st_setsrid (
    st_makepoint (
      -122.4194 + (RANDOM() - 0.5) * 0.1,
      37.7749 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  'device',
  'NA',
  'US',
  'CA'
FROM
  GENERATE_SERIES(1, 130);


-- Paris, France - Generate 100 sessions
INSERT INTO
  public.sessions (
    id,
    user_id,
    started_at,
    ended_at,
    location,
    platform,
    app_version,
    os,
    os_version,
    connectivity,
    language_entity_id,
    location_source,
    continent_code,
    country_code,
    region_code
  )
SELECT
  GEN_RANDOM_UUID(),
  (
    SELECT
      id
    FROM
      public.users
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '3 hours'),
  CASE
    WHEN (generate_series % 15) = 0 THEN NULL
    ELSE '2025-11-21 08:00:00+00'::TIMESTAMPTZ - (RANDOM() * INTERVAL '10 minutes')
  END, -- Some active sessions
  st_setsrid (
    st_makepoint (
      2.3522 + (RANDOM() - 0.5) * 0.1,
      48.8566 + (RANDOM() - 0.5) * 0.1
    ),
    4326
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'ios'
    WHEN 1 THEN 'android'
    ELSE 'web'
  END::platform_type,
  '1.0.0',
  CASE (generate_series % 3)
    WHEN 0 THEN 'iOS'
    WHEN 1 THEN 'Android'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN '17.0'
    WHEN 1 THEN '14.0'
    ELSE NULL
  END,
  CASE (generate_series % 3)
    WHEN 0 THEN 'wifi'
    WHEN 1 THEN 'cellular'
    ELSE 'wifi'
  END::connectivity_type,
  (
    SELECT
      id
    FROM
      public.language_entities
    LIMIT
      1
    OFFSET
      (generate_series % 5)
  ),
  CASE (generate_series % 3)
    WHEN 0 THEN 'device'
    WHEN 1 THEN 'ip'
    ELSE 'device'
  END::location_source_type,
  'EU',
  'FR',
  NULL
FROM
  GENERATE_SERIES(1, 100);


-- ============================================================================
-- INSERT BULK CHAPTER LISTENS
-- ============================================================================
-- Create chapter_listens for all the sessions we just created
-- Each session gets 2-5 chapter listens with timestamps during the session
-- Chapter listens for New York sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (-74.006 - 0.1, 40.7128 - 0.1),
      st_point (-74.006 + 0.1, 40.7128 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  450;


-- ~3 listens per session on average
-- Chapter listens for London sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (-0.1276 - 0.1, 51.5074 - 0.1),
      st_point (-0.1276 + 0.1, 51.5074 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  360;


-- ~3 listens per session
-- Chapter listens for Tokyo sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (139.6503 - 0.1, 35.6762 - 0.1),
      st_point (139.6503 + 0.1, 35.6762 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  600;


-- ~3 listens per session
-- Chapter listens for Sydney sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (151.2093 - 0.1, -33.8688 - 0.1),
      st_point (151.2093 + 0.1, -33.8688 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  300;


-- ~3 listens per session
-- Chapter listens for São Paulo sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (-46.6333 - 0.1, -23.5505 - 0.1),
      st_point (-46.6333 + 0.1, -23.5505 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  540;


-- ~3 listens per session
-- Chapter listens for Lagos sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (3.3792 - 0.1, 6.5244 - 0.1),
      st_point (3.3792 + 0.1, 6.5244 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  420;


-- ~3 listens per session
-- Chapter listens for Mumbai sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (72.8777 - 0.1, 19.0760 - 0.1),
      st_point (72.8777 + 0.1, 19.0760 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  660;


-- ~3 listens per session
-- Chapter listens for Beijing sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (116.4074 - 0.1, 39.9042 - 0.1),
      st_point (116.4074 + 0.1, 39.9042 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  570;


-- ~3 listens per session
-- Chapter listens for Cairo sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (31.2357 - 0.1, 30.0444 - 0.1),
      st_point (31.2357 + 0.1, 30.0444 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  330;


-- ~3 listens per session
-- Chapter listens for Mexico City sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (-99.1332 - 0.1, 19.4326 - 0.1),
      st_point (-99.1332 + 0.1, 19.4326 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  480;


-- ~3 listens per session
-- Chapter listens for San Francisco sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (-122.4194 - 0.1, 37.7749 - 0.1),
      st_point (-122.4194 + 0.1, 37.7749 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  390;


-- ~3 listens per session
-- Chapter listens for Paris sessions
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    listened_at
  )
SELECT
  GEN_RANDOM_UUID(),
  s.user_id,
  s.id,
  (
    SELECT
      id
    FROM
      public.chapters
    ORDER BY
      id
    LIMIT
      1
    OFFSET
      (ABS(hashtext (s.id::TEXT)) % 10)
  ),
  s.language_entity_id,
  s.started_at + (
    RANDOM() * (COALESCE(s.ended_at, NOW()) - s.started_at)
  )
FROM
  public.sessions s
WHERE
  s.location && st_setsrid (
    st_makebox2d (
      st_point (2.3522 - 0.1, 48.8566 - 0.1),
      st_point (2.3522 + 0.1, 48.8566 + 0.1)
    ),
    4326
  )
  AND s.started_at >= '2025-11-21 05:00:00+00'::TIMESTAMPTZ
LIMIT
  300;


-- ~3 listens per session
-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify)
-- ============================================================================
-- Check total session count
-- SELECT COUNT(*) as total_sessions FROM public.sessions WHERE started_at >= '2025-11-21 05:00:00+00'::timestamptz;
-- Check sessions by location
-- SELECT 
--   ST_X(location) as lon,
--   ST_Y(location) as lat,
--   COUNT(*) as session_count,
--   country_code
-- FROM public.sessions
-- WHERE started_at >= '2025-11-21 05:00:00+00'::timestamptz
-- GROUP BY location, country_code
-- ORDER BY session_count DESC;
-- Check the heatmap view
-- SELECT 
--   ST_X(grid) as lon,
--   ST_Y(grid) as lat,
--   session_count,
--   intensity,
--   total_duration_seconds
-- FROM vw_global_sessions_heatmap
-- ORDER BY session_count DESC
-- LIMIT 20;
-- Check total chapter_listens
-- SELECT COUNT(*) as total_listens FROM public.chapter_listens cl
-- INNER JOIN public.sessions s ON cl.session_id = s.id
-- WHERE s.started_at >= '2025-11-21 05:00:00+00'::timestamptz;

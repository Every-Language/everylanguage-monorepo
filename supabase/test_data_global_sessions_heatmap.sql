-- Test Data for Global Sessions Heatmap
-- This script inserts test sessions and chapter_listens with locations around the world
-- Date: November 21, 2025 around 8am
-- 
-- Usage: Copy and paste this into your Supabase SQL editor
-- The script uses subqueries to get actual user_ids, language_entity_ids, and chapter_ids
-- from your database, so it should work regardless of what's already in there.
-- ============================================================================
-- INSERT SESSIONS
-- ============================================================================
-- Sessions with locations around the world, recent timestamps (Nov 21, 2025 ~8am)
-- Locations: New York, London, Tokyo, Sydney, São Paulo, Lagos, Mumbai, Beijing, Cairo, Mexico City, San Francisco, Paris
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
VALUES
  -- New York, USA (3 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    '2025-11-21 08:00:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-74.006, 40.7128), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    'wifi',
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
    'device',
    'NA',
    'US',
    'NY'
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:15:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:45:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-74.006, 40.7128), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'cellular',
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
    'device',
    'NA',
    'US',
    'NY'
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-74.006, 40.7128), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.5',
    'wifi',
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
    'device',
    'NA',
    'US',
    'NY'
  ),
  -- London, UK (2 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:20:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:50:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-0.1276, 51.5074), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'cellular',
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
    'device',
    'EU',
    'GB',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:10:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:40:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-0.1276, 51.5074), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    'wifi',
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
    'device',
    'EU',
    'GB',
    NULL
  ),
  -- Tokyo, Japan (4 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:25:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:55:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (139.6503, 35.6762), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.5',
    'wifi',
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
    'device',
    'AS',
    'JP',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        3
    ),
    '2025-11-21 07:05:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:35:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (139.6503, 35.6762), 4326),
    'android',
    '1.0.0',
    'Android',
    '13.0',
    'wifi',
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
    'device',
    'AS',
    'JP',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        4
    ),
    '2025-11-21 06:50:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:20:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (139.6503, 35.6762), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.1',
    'cellular',
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
    'device',
    'AS',
    'JP',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 06:30:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (139.6503, 35.6762), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'wifi',
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
    'device',
    'AS',
    'JP',
    NULL
  ),
  -- Sydney, Australia (2 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:15:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:45:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (151.2093, -33.8688), 4326),
    'android',
    '1.0.0',
    'Android',
    '13.0',
    'wifi',
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
    'device',
    'OC',
    'AU',
    'NSW'
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (151.2093, -33.8688), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.0',
    'wifi',
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
    'device',
    'OC',
    'AU',
    'NSW'
  ),
  -- São Paulo, Brazil (3 sessions)
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        3
    ),
    '2025-11-21 07:20:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:50:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-46.6333, -23.5505), 4326),
    'web',
    '1.0.0',
    NULL,
    NULL,
    'wifi',
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
    'ip',
    'SA',
    'BR',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        4
    ),
    '2025-11-21 07:10:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:40:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-46.6333, -23.5505), 4326),
    'android',
    '1.0.0',
    'Android',
    '12.0',
    'cellular',
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
    'device',
    'SA',
    'BR',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-46.6333, -23.5505), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    'wifi',
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
    'device',
    'SA',
    'BR',
    NULL
  ),
  -- Lagos, Nigeria (2 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:15:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:45:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (3.3792, 6.5244), 4326),
    'android',
    '1.0.0',
    'Android',
    '12.0',
    'cellular',
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
    'device',
    'AF',
    'NG',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:05:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:35:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (3.3792, 6.5244), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.0',
    'cellular',
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
    'device',
    'AF',
    'NG',
    NULL
  ),
  -- Mumbai, India (3 sessions)
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        3
    ),
    '2025-11-21 07:25:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:55:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (72.8777, 19.0760), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.1',
    'wifi',
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
    'device',
    'AS',
    'IN',
    'MH'
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        4
    ),
    '2025-11-21 07:10:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:40:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (72.8777, 19.0760), 4326),
    'android',
    '1.0.0',
    'Android',
    '13.5',
    'wifi',
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
    'device',
    'AS',
    'IN',
    'MH'
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (72.8777, 19.0760), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.5',
    'cellular',
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
    'device',
    'AS',
    'IN',
    'MH'
  ),
  -- Beijing, China (2 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:20:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:50:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (116.4074, 39.9042), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'wifi',
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
    'device',
    'AS',
    'CN',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:05:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:35:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (116.4074, 39.9042), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    'wifi',
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
    'device',
    'AS',
    'CN',
    NULL
  ),
  -- Cairo, Egypt (2 sessions)
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        3
    ),
    '2025-11-21 07:15:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:45:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (31.2357, 30.0444), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.0',
    'cellular',
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
    'device',
    'AF',
    'EG',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        4
    ),
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (31.2357, 30.0444), 4326),
    'android',
    '1.0.0',
    'Android',
    '13.0',
    'cellular',
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
    'device',
    'AF',
    'EG',
    NULL
  ),
  -- Mexico City, Mexico (3 sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:25:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:55:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-99.1332, 19.4326), 4326),
    'android',
    '1.0.0',
    'Android',
    '13.5',
    'wifi',
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
    'device',
    'NA',
    'MX',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:10:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:40:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-99.1332, 19.4326), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '16.5',
    'wifi',
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
    'device',
    'NA',
    'MX',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:00:00+00'::TIMESTAMPTZ,
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    st_setsrid (st_makepoint (-99.1332, 19.4326), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'cellular',
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
    'device',
    'NA',
    'MX',
    NULL
  ),
  -- San Francisco, USA (2 active sessions - no ended_at)
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        3
    ),
    '2025-11-21 07:30:00+00'::TIMESTAMPTZ,
    NULL,
    st_setsrid (st_makepoint (-122.4194, 37.7749), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    'wifi',
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
    'device',
    'NA',
    'US',
    'CA'
  ),
  (
    GEN_RANDOM_UUID(),
    (
      SELECT
        id
      FROM
        public.users
      LIMIT
        1
      OFFSET
        4
    ),
    '2025-11-21 07:15:00+00'::TIMESTAMPTZ,
    NULL,
    st_setsrid (st_makepoint (-122.4194, 37.7749), 4326),
    'android',
    '1.0.0',
    'Android',
    '14.0',
    'wifi',
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
    'device',
    'NA',
    'US',
    'CA'
  ),
  -- Paris, France (2 active sessions)
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:20:00+00'::TIMESTAMPTZ,
    NULL,
    st_setsrid (st_makepoint (2.3522, 48.8566), 4326),
    'web',
    '1.0.0',
    NULL,
    NULL,
    'wifi',
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
    'ip',
    'EU',
    'FR',
    NULL
  ),
  (
    GEN_RANDOM_UUID(),
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
    '2025-11-21 07:05:00+00'::TIMESTAMPTZ,
    NULL,
    st_setsrid (st_makepoint (2.3522, 48.8566), 4326),
    'ios',
    '1.0.0',
    'iOS',
    '17.1',
    'wifi',
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
    'device',
    'EU',
    'FR',
    NULL
  );


-- ============================================================================
-- INSERT CHAPTER LISTENS
-- ============================================================================
-- Create chapter_listens for the sessions we just created
-- Each session gets 2-4 chapter listens with timestamps during the session
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
    LIMIT
      1
    OFFSET
      0
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  3;


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
    LIMIT
      1
    OFFSET
      1
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      2
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
  AND s.started_at >= '2025-11-21 06:30:00+00'::TIMESTAMPTZ
LIMIT
  4;


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
    LIMIT
      1
    OFFSET
      3
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      4
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  3;


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
    LIMIT
      1
    OFFSET
      5
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      6
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  3;


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
    LIMIT
      1
    OFFSET
      7
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      8
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      9
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  3;


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
    LIMIT
      1
    OFFSET
      0
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


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
    LIMIT
      1
    OFFSET
      1
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
  AND s.started_at >= '2025-11-21 07:00:00+00'::TIMESTAMPTZ
LIMIT
  2;


-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify)
-- ============================================================================
-- Check how many sessions were created (filter by recent timestamp)
-- SELECT COUNT(*) as session_count FROM public.sessions WHERE started_at >= '2025-11-21 06:30:00+00'::timestamptz;
-- Check how many chapter_listens were created
-- SELECT COUNT(*) as listen_count FROM public.chapter_listens cl
-- INNER JOIN public.sessions s ON cl.session_id = s.id
-- WHERE s.started_at >= '2025-11-21 06:30:00+00'::timestamptz;
-- Check the heatmap view
-- SELECT * FROM vw_global_sessions_heatmap ORDER BY session_count DESC LIMIT 20;
-- Check sessions by location
-- SELECT 
--   ST_X(location) as lon,
--   ST_Y(location) as lat,
--   COUNT(*) as session_count,
--   country_code,
--   continent_code
-- FROM public.sessions
-- WHERE started_at >= '2025-11-21 06:30:00+00'::timestamptz
-- GROUP BY location, country_code, continent_code
-- ORDER BY session_count DESC;

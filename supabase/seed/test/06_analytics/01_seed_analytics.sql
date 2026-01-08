-- Analytics Models Seed Data
-- Analytics events and tracking tables
-- Note: users_anon table was consolidated into users table with is_anonymous flag (migration 20250808095608)
-- ============================================================================
-- ANONYMOUS USERS (in users table with is_anonymous = TRUE)
-- ============================================================================
INSERT INTO
  public.users (
    id,
    is_anonymous,
    created_at,
    updated_at
  )
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440030',
    TRUE,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440031',
    TRUE,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440032',
    TRUE,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- APP_DOWNLOADS (must be seeded before sessions that reference them)
-- ============================================================================
INSERT INTO
  public.app_downloads (
    id,
    user_id,
    device_id,
    location,
    app_version,
    platform,
    os,
    os_version,
    origin_share_id,
    downloaded_at
  )
VALUES
  (
    '220e8400-e29b-41d4-a716-446655440030',
    'aa0e8400-e29b-41d4-a716-446655440030',
    'device-ios-001',
    ST_MakePoint(-155.9969, 19.6389),
    '1.0.0',
    'ios',
    'iOS',
    '17.0',
    NULL,
    NOW() - INTERVAL '30 days'
  ),
  (
    '220e8400-e29b-41d4-a716-446655440031',
    'aa0e8400-e29b-41d4-a716-446655440031',
    'device-android-001',
    ST_MakePoint(-122.4194, 37.7749),
    '1.0.0',
    'android',
    'Android',
    '13.0',
    NULL,
    NOW() - INTERVAL '20 days'
  ),
  (
    '220e8400-e29b-41d4-a716-446655440032',
    'aa0e8400-e29b-41d4-a716-446655440032',
    'device-ios-002',
    ST_MakePoint(-74.0060, 40.7128),
    '1.1.0',
    'ios',
    'iOS',
    '17.1',
    NULL,
    NOW() - INTERVAL '10 days'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SESSIONS
-- ============================================================================
INSERT INTO
  public.sessions (
    id,
    user_id,
    app_download_id,
    started_at,
    ended_at,
    connectivity,
    location,
    location_source,
    continent_code,
    country_code,
    region_code,
    platform,
    app_version,
    os,
    os_version,
    language_entity_id
  )
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    '220e8400-e29b-41d4-a716-446655440030',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour',
    'wifi',
    ST_MakePoint(-155.9969, 19.6389),
    'ip',
    'NA',
    'US',
    'HI',
    'ios',
    '1.0.0',
    'iOS',
    '17.0',
    '990e8400-e29b-41d4-a716-446655440001' -- Lang A
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440031',
    'aa0e8400-e29b-41d4-a716-446655440030', -- Anonymous user
    '220e8400-e29b-41d4-a716-446655440031',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '30 minutes',
    'cellular',
    ST_MakePoint(-122.4194, 37.7749),
    'ip',
    'NA',
    'US',
    'CA',
    'android',
    '1.0.0',
    'Android',
    '13.0',
    '990e8400-e29b-41d4-a716-446655440002' -- Lang B
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440032',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    '220e8400-e29b-41d4-a716-446655440032',
    NOW() - INTERVAL '3 hours',
    NULL, -- Active session
    'wifi',
    ST_MakePoint(-74.0060, 40.7128),
    'ip',
    'NA',
    'US',
    'NY',
    'ios',
    '1.1.0',
    'iOS',
    '17.1',
    '990e8400-e29b-41d4-a716-446655440001' -- Lang A
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- MEDIA_FILE_LISTENS
-- ============================================================================
INSERT INTO
  public.media_file_listens (
    id,
    user_id,
    session_id,
    media_file_id,
    language_entity_id,
    position_seconds,
    duration_seconds,
    origin_share_id,
    listened_at
  )
VALUES
  (
    'cc0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440030',
    '660e8400-e29b-41d4-a716-446655440010', -- Genesis 1 audio
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    0,
    600, -- 10 minutes
    NULL,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440031',
    'aa0e8400-e29b-41d4-a716-446655440030', -- Anonymous user
    'bb0e8400-e29b-41d4-a716-446655440031',
    '660e8400-e29b-41d4-a716-446655440011', -- Genesis 1 Lang B audio
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    0,
    300, -- 5 minutes
    NULL,
    NOW() - INTERVAL '1 day'
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440032',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'bb0e8400-e29b-41d4-a716-446655440032',
    '660e8400-e29b-41d4-a716-446655440012', -- Genesis 2 audio
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    0,
    180, -- 3 minutes
    NULL,
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- VERSE_LISTENS
-- ============================================================================
INSERT INTO
  public.verse_listens (
    id,
    user_id,
    session_id,
    verse_id,
    language_entity_id,
    origin_share_id,
    listened_at
  )
VALUES
  (
    'dd0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440030',
    'gen-1-1',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440031',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440030',
    'gen-1-2',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440032',
    'aa0e8400-e29b-41d4-a716-446655440030', -- Anonymous user
    'bb0e8400-e29b-41d4-a716-446655440031',
    'gen-1-1',
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    NULL,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- CHAPTER_LISTENS
-- ============================================================================
INSERT INTO
  public.chapter_listens (
    id,
    user_id,
    session_id,
    chapter_id,
    language_entity_id,
    origin_share_id,
    listened_at
  )
VALUES
  (
    'ee0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440030',
    'gen-1',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440031',
    'aa0e8400-e29b-41d4-a716-446655440030', -- Anonymous user
    'bb0e8400-e29b-41d4-a716-446655440031',
    'gen-1',
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    NULL,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SHARES
-- ============================================================================
INSERT INTO
  public.shares (
    id,
    user_id,
    session_id,
    share_entity_type,
    share_entity_id,
    language_entity_id,
    parent_share_id,
    shared_at
  )
VALUES
  (
    'ff0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440030',
    'verse',
    'gen-1-1', -- Share entity ID (TEXT)
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NOW() - INTERVAL '5 days'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440031',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'bb0e8400-e29b-41d4-a716-446655440032',
    'chapter',
    'gen-1', -- Share entity ID (TEXT)
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NOW() - INTERVAL '3 days'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440032',
    'aa0e8400-e29b-41d4-a716-446655440030', -- Anonymous user
    'bb0e8400-e29b-41d4-a716-446655440031',
    'verse',
    'gen-1-2', -- Share entity ID (TEXT)
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    NULL,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SHARE_OPENS
-- ============================================================================
INSERT INTO
  public.share_opens (
    id,
    share_id,
    user_id,
    session_id,
    parent_share_id,
    opened_at
  )
VALUES
  (
    '110e8400-e29b-41d4-a716-446655440030',
    'ff0e8400-e29b-41d4-a716-446655440030',
    'aa0e8400-e29b-41d4-a716-446655440031',
    'bb0e8400-e29b-41d4-a716-446655440031',
    NULL,
    NOW() - INTERVAL '4 days'
  ),
  (
    '110e8400-e29b-41d4-a716-446655440031',
    'ff0e8400-e29b-41d4-a716-446655440030',
    'aa0e8400-e29b-41d4-a716-446655440032',
    'bb0e8400-e29b-41d4-a716-446655440032',
    NULL,
    NOW() - INTERVAL '3 days'
  ),
  (
    '110e8400-e29b-41d4-a716-446655440032',
    'ff0e8400-e29b-41d4-a716-446655440031',
    'aa0e8400-e29b-41d4-a716-446655440030',
    'bb0e8400-e29b-41d4-a716-446655440031',
    NULL,
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- VERSE_FEEDBACK
-- ============================================================================
INSERT INTO
  public.verse_feedback (
    id,
    media_files_id,
    verse_id,
    feedback_type,
    feedback_text,
    actioned,
    version,
    created_at,
    created_by,
    updated_at,
    updated_by
  )
VALUES
  (
    '330e8400-e29b-41d4-a716-446655440030',
    '660e8400-e29b-41d4-a716-446655440010', -- Genesis 1 audio
    'gen-1-1',
    'change_required',
    'Translation note: Consider alternative translation for "beginning"',
    'pending',
    1,
    NOW() - INTERVAL '7 days',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    NOW(),
    '880e8400-e29b-41d4-a716-446655440001'
  ),
  (
    '330e8400-e29b-41d4-a716-446655440031',
    '660e8400-e29b-41d4-a716-446655440011', -- Genesis 1 Lang B audio
    'gen-1-2',
    'approved',
    NULL,
    'pending',
    1,
    NOW() - INTERVAL '5 days',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    NOW(),
    '880e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (id) DO NOTHING;

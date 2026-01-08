-- Bible Content Models Seed Data
-- Audio Versions, Text Versions, Media Files, and related tables
-- Note: tags, sequences_tags, media_files_tags, and media_files_targets tables were dropped in migration 20251226000001
-- ============================================================================

-- ============================================================================
-- AUDIO_VERSIONS
-- ============================================================================
INSERT INTO
  public.audio_versions (
    id,
    language_entity_id,
    bible_version_id,
    project_id,
    name,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440020',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    'bible-version-protestant-standard',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    'Lang A Standard Audio',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440021',
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    'bible-version-protestant-standard',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    'Lang B Standard Audio',
    '880e8400-e29b-41d4-a716-446655440002',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- TEXT_VERSIONS
-- ============================================================================
INSERT INTO
  public.text_versions (
    id,
    language_entity_id,
    bible_version_id,
    name,
    text_version_source,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    '440e8400-e29b-41d4-a716-446655440001',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    'bible-version-protestant-standard',
    'Lang A Standard Translation',
    'official_translation',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  (
    '440e8400-e29b-41d4-a716-446655440002',
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    'bible-version-protestant-standard',
    'Lang B Standard Translation',
    'official_translation',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- VERSE_TEXTS
-- ============================================================================
INSERT INTO
  public.verse_texts (
    id,
    verse_id,
    text_version_id,
    verse_text,
    created_by,
    created_at,
    updated_at
  )
VALUES
  -- Genesis 1:1 in Lang A
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'gen-1-1',
    '440e8400-e29b-41d4-a716-446655440001',
    'In the beginning God created the heavens and the earth.',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  -- Genesis 1:1 in Lang B
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'gen-1-1',
    '440e8400-e29b-41d4-a716-446655440002',
    'In the beginning God created the heavens and the earth.',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  -- Genesis 1:2 in Lang A
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'gen-1-2',
    '440e8400-e29b-41d4-a716-446655440001',
    'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- MEDIA_FILES
-- ============================================================================
INSERT INTO
  public.media_files (
    id,
    language_entity_id,
    project_id,
    media_type,
    object_key,
    storage_provider,
    file_size,
    duration_seconds,
    upload_status,
    publish_status,
    check_status,
    version,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    '660e8400-e29b-41d4-a716-446655440010',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    'audio',
    'media/gen1-langa.mp3',
    'cloudflare_r2',
    5242880, -- 5MB
    180, -- 3 minutes
    'completed',
    'published',
    'approved',
    1,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440011',
    '990e8400-e29b-41d4-a716-446655440002', -- Lang B
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    'audio',
    'media/gen1-langb.mp3',
    'cloudflare_r2',
    5242880,
    180,
    'completed',
    'published',
    'approved',
    1,
    '880e8400-e29b-41d4-a716-446655440002',
    NOW(),
    NOW()
  ),
  (
    '660e8400-e29b-41d4-a716-446655440012',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    'audio',
    'media/gen2-langa.mp3',
    'cloudflare_r2',
    3145728, -- 3MB
    120, -- 2 minutes
    'completed',
    'pending',
    'requires_review',
    1,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: media_files_targets table was dropped in migration 20251226000001


-- ============================================================================
-- MEDIA_FILES_VERSES
-- ============================================================================
INSERT INTO
  public.media_files_verses (
    id,
    media_file_id,
    verse_id,
    start_time_seconds,
    duration_seconds,
    created_by,
    created_at,
    updated_at
  )
VALUES
  -- Genesis 1:1 in media file
  (
    '880e8400-e29b-41d4-a716-446655440010',
    '660e8400-e29b-41d4-a716-446655440010',
    'gen-1-1',
    0,
    10,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  -- Genesis 1:2 in media file
  (
    '880e8400-e29b-41d4-a716-446655440011',
    '660e8400-e29b-41d4-a716-446655440010',
    'gen-1-2',
    10,
    15,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: media_files_tags table was dropped in migration 20251226000001


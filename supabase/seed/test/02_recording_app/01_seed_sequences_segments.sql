-- Recording App Models Seed Data
-- Sequences, Segments, and related tables
-- ============================================================================
-- SEQUENCES
-- ============================================================================
-- Note: Requires projects and books to exist (from production seeds and test users seed)
INSERT INTO
  public.sequences (
    id,
    name,
    description,
    book_id,
    is_bible_audio,
    start_verse_id,
    end_verse_id,
    project_id
  )
VALUES
  -- Sequence for Test Project Kona - Genesis 1
  (
    'cc0e8400-e29b-41d4-a716-446655440001',
    'Genesis Chapter 1',
    'First chapter of Genesis for testing',
    'gen', -- Genesis book ID from production seed (TEXT)
    TRUE,
    'gen-1-1', -- First verse of Genesis 1 (text ID)
    'gen-1-31', -- Last verse of Genesis 1 (text ID)
    'aa0e8400-e29b-41d4-a716-446655440001'::UUID -- Test Project Kona
  ),
  -- Sequence for Test Project Kona - Genesis 2
  (
    'cc0e8400-e29b-41d4-a716-446655440002',
    'Genesis Chapter 2',
    'Second chapter of Genesis for testing',
    'gen', -- Genesis book ID (TEXT)
    TRUE,
    'gen-2-1', -- Text ID
    'gen-2-25', -- Text ID
    'aa0e8400-e29b-41d4-a716-446655440001'::UUID
  ),
  -- Sequence for Test Project - Matthew 1
  (
    'cc0e8400-e29b-41d4-a716-446655440003',
    'Matthew Chapter 1',
    'First chapter of Matthew for testing',
    'matt', -- Matthew book ID from production seed (TEXT)
    TRUE,
    'matt-1-1', -- Text ID
    'matt-1-25', -- Text ID
    'aa0e8400-e29b-41d4-a716-446655440002'::UUID -- Test Project
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SEGMENTS
-- ============================================================================
INSERT INTO
  public.segments (
    id,
    type,
    local_path,
    remote_path,
    created_by,
    created_at,
    updated_at
  )
VALUES
  -- Source segments
  (
    'dd0e8400-e29b-41d4-a716-446655440001',
    'source',
    '/local/segments/gen1-source-1.mp3',
    'https://storage.example.com/segments/gen1-source-1.mp3',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    NOW(),
    NOW()
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440002',
    'source',
    '/local/segments/gen1-source-2.mp3',
    'https://storage.example.com/segments/gen1-source-2.mp3',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  -- Target segments
  (
    'dd0e8400-e29b-41d4-a716-446655440003',
    'target',
    '/local/segments/gen1-target-1.mp3',
    'https://storage.example.com/segments/gen1-target-1.mp3',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    NOW(),
    NOW()
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440004',
    'target',
    '/local/segments/gen1-target-2.mp3',
    'https://storage.example.com/segments/gen1-target-2.mp3',
    '880e8400-e29b-41d4-a716-446655440002',
    NOW(),
    NOW()
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440005',
    'source',
    '/local/segments/gen2-source-1.mp3',
    'https://storage.example.com/segments/gen2-source-1.mp3',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440006',
    'target',
    '/local/segments/gen2-target-1.mp3',
    'https://storage.example.com/segments/gen2-target-1.mp3',
    '880e8400-e29b-41d4-a716-446655440003', -- Priya Sharma
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- SEQUENCES_SEGMENTS (Junction table)
-- ============================================================================
INSERT INTO
  public.sequences_segments (
    id,
    sequence_id,
    segment_id,
    segment_index,
    segment_color,
    is_deleted,
    is_numbered,
    created_at,
    updated_at
  )
VALUES
  -- Genesis 1 sequence segments
  (
    'ee0e8400-e29b-41d4-a716-446655440001',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'dd0e8400-e29b-41d4-a716-446655440001',
    0,
    '#FF5733',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440002',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'dd0e8400-e29b-41d4-a716-446655440002',
    1,
    '#33FF57',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440003',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'dd0e8400-e29b-41d4-a716-446655440003',
    2,
    '#3357FF',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440004',
    'cc0e8400-e29b-41d4-a716-446655440001',
    'dd0e8400-e29b-41d4-a716-446655440004',
    3,
    '#FF33F5',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  -- Genesis 2 sequence segments
  (
    'ee0e8400-e29b-41d4-a716-446655440005',
    'cc0e8400-e29b-41d4-a716-446655440002',
    'dd0e8400-e29b-41d4-a716-446655440005',
    0,
    '#FF5733',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440006',
    'cc0e8400-e29b-41d4-a716-446655440002',
    'dd0e8400-e29b-41d4-a716-446655440006',
    1,
    '#33FF57',
    FALSE,
    TRUE,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: sequences_targets and segments_targets tables were dropped in migration 20251226000001


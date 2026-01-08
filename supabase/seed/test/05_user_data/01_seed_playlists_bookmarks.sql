-- User Data Models Seed Data
-- Playlists, Bookmarks, and related tables
-- ============================================================================
-- USER_PLAYLIST_GROUPS
-- ============================================================================
INSERT INTO
  public.user_playlist_groups (
    id,
    user_id,
    name,
    description,
    created_at,
    updated_at
  )
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'My Favorites',
    'Favorite audio content',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'Study Playlist',
    'Content for Bible study',
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'aa0e8400-e29b-41d4-a716-446655440022',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'Morning Devotion',
    'Morning devotional content',
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PLAYLISTS (shared playlists, no user_id)
-- ============================================================================
INSERT INTO
  public.playlists (
    id,
    title,
    description,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440020',
    'Genesis Collection',
    'All Genesis chapters',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440021',
    'New Testament Highlights',
    'Favorite NT chapters',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440022',
    'Worship Songs',
    'Worship audio content',
    '880e8400-e29b-41d4-a716-446655440002',
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER_PLAYLISTS (user-owned references to shared playlists)
-- ============================================================================
INSERT INTO
  public.user_playlists (
    id,
    user_id,
    playlist_id,
    user_playlist_group_id,
    created_at,
    updated_at
  )
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440020', -- Genesis Collection
    'aa0e8400-e29b-41d4-a716-446655440020', -- My Favorites group
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440031',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'bb0e8400-e29b-41d4-a716-446655440021', -- New Testament Highlights
    'aa0e8400-e29b-41d4-a716-446655440021', -- Study Playlist group
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'bb0e8400-e29b-41d4-a716-446655440032',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'bb0e8400-e29b-41d4-a716-446655440022', -- Worship Songs
    NULL, -- No group
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- PLAYLIST_ITEMS
-- ============================================================================
INSERT INTO
  public.playlist_items (
    id,
    playlist_id,
    playlist_item_type,
    start_verse_id,
    end_verse_id,
    order_index,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    'cc0e8400-e29b-41d4-a716-446655440020',
    'bb0e8400-e29b-41d4-a716-446655440020',
    'passage',
    'gen-1-1',
    'gen-1-31',
    1,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440021',
    'bb0e8400-e29b-41d4-a716-446655440020',
    'passage',
    'gen-2-1',
    'gen-2-25',
    2,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'cc0e8400-e29b-41d4-a716-446655440022',
    'bb0e8400-e29b-41d4-a716-446655440021',
    'passage',
    'matt-1-1',
    'matt-1-25',
    1,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: playlists_playlist_groups table was dropped in migration 20250804102809
-- The new structure uses user_playlists with user_playlist_group_id column


-- ============================================================================
-- USER_BOOKMARK_FOLDERS
-- ============================================================================
INSERT INTO
  public.user_bookmark_folders (
    id,
    user_id,
    name,
    parent_folder_id,
    created_at,
    updated_at
  )
VALUES
  (
    'ee0e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'Bible Study',
    NULL,
    NOW() - INTERVAL '25 days',
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'Sermons',
    NULL,
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'ee0e8400-e29b-41d4-a716-446655440022',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'Favorite Verses',
    NULL,
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER_BOOKMARKS
-- ============================================================================
INSERT INTO
  public.user_bookmarks (
    id,
    user_id,
    bookmark_folder_id,
    bookmark_type,
    start_verse_id,
    end_verse_id,
    note,
    created_at,
    updated_at
  )
VALUES
  (
    'ff0e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'ee0e8400-e29b-41d4-a716-446655440020', -- Bible Study folder
    'passage',
    'gen-1-1',
    'gen-1-1',
    'Creation verse',
    NOW() - INTERVAL '25 days',
    NOW()
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'ee0e8400-e29b-41d4-a716-446655440020', -- Bible Study folder
    'passage',
    'gen-1-1',
    'gen-1-31',
    'Genesis creation chapter',
    NOW() - INTERVAL '24 days',
    NOW()
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440022',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'ee0e8400-e29b-41d4-a716-446655440022', -- Favorite Verses folder
    'passage',
    'gen-1-1',
    'gen-1-1',
    'Favorite creation verse',
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: user_positions and user_custom_texts tables were dropped in migration 20250804102809


-- ============================================================================
-- USER_CURRENT_SELECTIONS
-- ============================================================================
-- Note: This table only stores selected_audio_version and selected_text_version
INSERT INTO
  public.user_current_selections (
    id,
    user_id,
    selected_audio_version,
    selected_text_version,
    created_at,
    updated_at
  )
VALUES
  (
    '330e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'aa0e8400-e29b-41d4-a716-446655440020', -- Lang A Standard Audio
    '440e8400-e29b-41d4-a716-446655440001', -- Lang A Standard Translation
    NOW(),
    NOW()
  ),
  (
    '330e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'aa0e8400-e29b-41d4-a716-446655440021', -- Lang B Standard Audio
    '440e8400-e29b-41d4-a716-446655440002', -- Lang B Standard Translation
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER_SAVED_AUDIO_VERSIONS
-- ============================================================================
-- Note: This table references audio_versions, not media_files
INSERT INTO
  public.user_saved_audio_versions (
    id,
    user_id,
    audio_version_id,
    created_at,
    updated_at
  )
VALUES
  (
    '440e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    'aa0e8400-e29b-41d4-a716-446655440020', -- Lang A Standard Audio
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    '440e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    'aa0e8400-e29b-41d4-a716-446655440021', -- Lang B Standard Audio
    NOW() - INTERVAL '8 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER_SAVED_TEXT_VERSIONS
-- ============================================================================
INSERT INTO
  public.user_saved_text_versions (
    id,
    user_id,
    text_version_id,
    created_at,
    updated_at
  )
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- Sarah Johnson
    '440e8400-e29b-41d4-a716-446655440001', -- Lang A Standard Translation
    NOW() - INTERVAL '12 days',
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440002', -- Michael Chen
    '440e8400-e29b-41d4-a716-446655440002', -- Lang B Standard Translation
    NOW() - INTERVAL '10 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


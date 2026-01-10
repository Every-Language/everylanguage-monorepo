-- Add minimal media files to make test projects appear in get_active_projects_with_progress
-- This creates a single media file per audio version to generate progress data

BEGIN;

DO $$
DECLARE
  av_id UUID;
  test_chapter_id TEXT;
  test_verse_id UUID;
  media_file_id UUID;
BEGIN
  -- Get first chapter and verse
  SELECT id::text INTO test_chapter_id FROM chapters LIMIT 1;
  SELECT v.id INTO test_verse_id FROM verses v LIMIT 1;
  
  -- If no verse found, exit
  IF test_verse_id IS NULL THEN
    RAISE NOTICE 'No verses found, skipping media file creation';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found verse: %, chapter: %', test_verse_id, test_chapter_id;

  -- For each test audio version, create a media file
  RAISE NOTICE 'Looking for audio versions...';
  FOR av_id IN 
    SELECT id FROM audio_versions 
    WHERE project_id IN (
      SELECT id FROM projects WHERE name LIKE 'Test Project%'
    )
  LOOP
    RAISE NOTICE 'Creating media file for audio version: %', av_id;
    -- Create a media file
    INSERT INTO media_files (
      id,
      language_entity_id,
      audio_version_id,
      chapter_id,
      start_verse_id,
      media_type,
      is_bible_audio,
      upload_status,
      publish_status,
      file_type,
      duration_seconds
    )
    VALUES (
      gen_random_uuid(),
      (SELECT language_entity_id FROM audio_versions WHERE id = av_id),
      av_id,
      test_chapter_id,
      test_verse_id,
      'audio',
      TRUE,
      'completed',
      'published',
      'mp3',
      60
    )
    RETURNING id INTO media_file_id;

    -- Link verse to media file
    INSERT INTO media_files_verses (
      media_file_id,
      verse_id,
      start_time_seconds,
      duration_seconds
    )
    VALUES (
      media_file_id,
      test_verse_id,
      0,
      60
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

COMMIT;

-- Seed test projects for local development
-- Creates active projects with audio versions to test the map inspector

BEGIN;

-- Get or create a bible version
INSERT INTO bible_versions (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Standard Bible')
ON CONFLICT (id) DO NOTHING;

-- Get some language entities (or use existing ones)
-- We'll use the first few language entities from the database
DO $$
DECLARE
  lang1_id UUID;
  lang2_id UUID;
  lang3_id UUID;
  lang4_id UUID;
  lang5_id UUID;
  proj1_id UUID;
  proj2_id UUID;
  proj3_id UUID;
  proj4_id UUID;
  proj5_id UUID;
  av1_id UUID;
  av2_id UUID;
  av3_id UUID;
  av4_id UUID;
  av5_id UUID;
BEGIN
  -- Get first 5 language entities
  SELECT id INTO lang1_id FROM language_entities WHERE deleted_at IS NULL LIMIT 1 OFFSET 0;
  SELECT id INTO lang2_id FROM language_entities WHERE deleted_at IS NULL LIMIT 1 OFFSET 1;
  SELECT id INTO lang3_id FROM language_entities WHERE deleted_at IS NULL LIMIT 1 OFFSET 2;
  SELECT id INTO lang4_id FROM language_entities WHERE deleted_at IS NULL LIMIT 1 OFFSET 3;
  SELECT id INTO lang5_id FROM language_entities WHERE deleted_at IS NULL LIMIT 1 OFFSET 4;

  -- If we don't have enough languages, create some
  IF lang1_id IS NULL THEN
    INSERT INTO language_entities (id, name, level) VALUES
      ('10000000-0000-0000-0000-000000000001', 'Test Language 1', 'language')
    RETURNING id INTO lang1_id;
  END IF;

  IF lang2_id IS NULL THEN
    INSERT INTO language_entities (id, name, level) VALUES
      ('10000000-0000-0000-0000-000000000002', 'Test Language 2', 'language')
    RETURNING id INTO lang2_id;
  END IF;

  IF lang3_id IS NULL THEN
    INSERT INTO language_entities (id, name, level) VALUES
      ('10000000-0000-0000-0000-000000000003', 'Test Language 3', 'language')
    RETURNING id INTO lang3_id;
  END IF;

  IF lang4_id IS NULL THEN
    INSERT INTO language_entities (id, name, level) VALUES
      ('10000000-0000-0000-0000-000000000004', 'Test Language 4', 'language')
    RETURNING id INTO lang4_id;
  END IF;

  IF lang5_id IS NULL THEN
    INSERT INTO language_entities (id, name, level) VALUES
      ('10000000-0000-0000-0000-000000000005', 'Test Language 5', 'language')
    RETURNING id INTO lang5_id;
  END IF;

  -- Create projects with active status and published status for RLS
  INSERT INTO projects (id, name, description, source_language_entity_id, target_language_entity_id, project_status, publish_status)
  VALUES
    ('20000000-0000-0000-0000-000000000001', 'Test Project 1', 'First test project for map inspector', lang1_id, lang1_id, 'active', 'published'),
    ('20000000-0000-0000-0000-000000000002', 'Test Project 2', 'Second test project for map inspector', lang2_id, lang2_id, 'active', 'published'),
    ('20000000-0000-0000-0000-000000000003', 'Test Project 3', 'Third test project for map inspector', lang3_id, lang3_id, 'active', 'published'),
    ('20000000-0000-0000-0000-000000000004', 'Test Project 4', 'Fourth test project for map inspector', lang4_id, lang4_id, 'active', 'published'),
    ('20000000-0000-0000-0000-000000000005', 'Test Project 5', 'Fifth test project for map inspector', lang5_id, lang5_id, 'active', 'published')
  ON CONFLICT (name) DO UPDATE SET project_status = 'active', publish_status = 'published';

  -- Get project IDs
  SELECT id INTO proj1_id FROM projects WHERE name = 'Test Project 1';
  SELECT id INTO proj2_id FROM projects WHERE name = 'Test Project 2';
  SELECT id INTO proj3_id FROM projects WHERE name = 'Test Project 3';
  SELECT id INTO proj4_id FROM projects WHERE name = 'Test Project 4';
  SELECT id INTO proj5_id FROM projects WHERE name = 'Test Project 5';

  -- Create audio versions linked to projects with published status for RLS
  INSERT INTO audio_versions (id, language_entity_id, bible_version_id, project_id, name, publish_status)
  VALUES
    ('30000000-0000-0000-0000-000000000001', lang1_id, '00000000-0000-0000-0000-000000000001', proj1_id, 'OMT', 'published'),
    ('30000000-0000-0000-0000-000000000002', lang2_id, '00000000-0000-0000-0000-000000000001', proj2_id, 'OMT', 'published'),
    ('30000000-0000-0000-0000-000000000003', lang3_id, '00000000-0000-0000-0000-000000000001', proj3_id, 'OMT', 'published'),
    ('30000000-0000-0000-0000-000000000004', lang4_id, '00000000-0000-0000-0000-000000000001', proj4_id, 'OMT', 'published'),
    ('30000000-0000-0000-0000-000000000005', lang5_id, '00000000-0000-0000-0000-000000000001', proj5_id, 'OMT', 'published')
  ON CONFLICT (language_entity_id, bible_version_id, name) DO UPDATE SET project_id = EXCLUDED.project_id, publish_status = 'published';

  -- Refresh materialized views to update progress summaries (if they exist)
  -- Note: These views may not exist yet, so we'll skip refreshing them
  -- The views will be updated automatically when queried

END $$;

COMMIT;

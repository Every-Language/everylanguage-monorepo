-- Add missing columns that were manually added to dev
-- Denormalize project_id with triggers for PowerSync compatibility
-- Simplify resolve_project_id function to use denormalized columns
-- ============================================================================
-- 1. ADD MISSING COLUMNS
-- ============================================================================
-- Sequences table: upload_status, publish_status, check_status, chapter_id
DO $$
BEGIN
  -- Add upload_status (enum already exists from 20250703070000)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences' AND column_name = 'upload_status'
  ) THEN
    ALTER TABLE public.sequences 
    ADD COLUMN upload_status upload_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_upload_status 
    ON public.sequences (upload_status);
  END IF;

  -- Add publish_status (enum already exists from 20250703070000)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences' AND column_name = 'publish_status'
  ) THEN
    ALTER TABLE public.sequences 
    ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_publish_status 
    ON public.sequences (publish_status);
  END IF;

  -- Add check_status (enum already exists from 20250703070000)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences' AND column_name = 'check_status'
  ) THEN
    ALTER TABLE public.sequences 
    ADD COLUMN check_status check_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_check_status 
    ON public.sequences (check_status);
  END IF;

  -- Add chapter_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE public.sequences 
    ADD COLUMN chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_chapter_id 
    ON public.sequences (chapter_id)
    WHERE chapter_id IS NOT NULL;
  END IF;
END $$;


-- Sequences_segments table: is_hidden, verse_number, project_id
DO $$
BEGIN
  -- Add is_hidden
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences_segments' AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE public.sequences_segments 
    ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_segments_is_hidden 
    ON public.sequences_segments (is_hidden)
    WHERE is_hidden = TRUE;
  END IF;

  -- Add verse_number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences_segments' AND column_name = 'verse_number'
  ) THEN
    ALTER TABLE public.sequences_segments 
    ADD COLUMN verse_number BIGINT NOT NULL DEFAULT 0;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_segments_verse_number 
    ON public.sequences_segments (verse_number);
  END IF;

  -- Add project_id (will be maintained by triggers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sequences_segments' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.sequences_segments 
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_sequences_segments_project_id 
    ON public.sequences_segments (project_id)
    WHERE project_id IS NOT NULL;
  END IF;
END $$;


-- Media_files table: sequence_id, project_id
-- Note: local_path was intentionally removed in migration 20250724115034, so NOT adding it back
DO $$
BEGIN
  -- Add sequence_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_files' AND column_name = 'sequence_id'
  ) THEN
    ALTER TABLE public.media_files 
    ADD COLUMN sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_media_files_sequence_id 
    ON public.media_files (sequence_id)
    WHERE sequence_id IS NOT NULL;
  END IF;

  -- Add project_id (will be maintained by triggers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_files' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.media_files 
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_media_files_project_id 
    ON public.media_files (project_id)
    WHERE project_id IS NOT NULL;
  END IF;
END $$;


-- Media_files_verses table: verse_checker_status, verse_checker_comment, project_id
DO $$
BEGIN
  -- Add verse_checker_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_files_verses' AND column_name = 'verse_checker_status'
  ) THEN
    ALTER TABLE public.media_files_verses 
    ADD COLUMN verse_checker_status TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_media_files_verses_verse_checker_status 
    ON public.media_files_verses (verse_checker_status)
    WHERE verse_checker_status IS NOT NULL;
  END IF;

  -- Add verse_checker_comment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_files_verses' AND column_name = 'verse_checker_comment'
  ) THEN
    ALTER TABLE public.media_files_verses 
    ADD COLUMN verse_checker_comment TEXT;
  END IF;

  -- Add project_id (will be maintained by triggers)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_files_verses' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.media_files_verses 
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_media_files_verses_project_id 
    ON public.media_files_verses (project_id)
    WHERE project_id IS NOT NULL;
  END IF;
END $$;


-- Segments table: project_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_segments_project_id 
    ON public.segments (project_id)
    WHERE project_id IS NOT NULL;
  END IF;
END $$;


-- Projects table: region_name, source_language_name, target_language_name
DO $$
BEGIN
  -- Add region_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'region_name'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN region_name TEXT;
  END IF;

  -- Add source_language_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'source_language_name'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN source_language_name TEXT;
  END IF;

  -- Add target_language_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'target_language_name'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN target_language_name TEXT;
  END IF;
END $$;


-- ============================================================================
-- 2. CREATE TRIGGER FUNCTIONS FOR PROJECT_ID DENORMALIZATION
-- ============================================================================
-- Function: Update media_files.project_id when audio_versions.project_id changes
CREATE OR REPLACE FUNCTION update_media_files_project_id_from_audio_version () returns trigger AS $$
BEGIN
  -- Update all media_files when audio_version.project_id changes
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE media_files
    SET project_id = NEW.project_id
    WHERE audio_version_id = NEW.id;
  END IF;
  
  -- Handle INSERT: media_files will set project_id via their own trigger
  -- Handle DELETE: CASCADE will handle it
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Set media_files.project_id from audio_version on insert/update
CREATE OR REPLACE FUNCTION set_media_files_project_id_from_audio_version () returns trigger AS $$
BEGIN
  -- Get project_id from audio_version
  IF NEW.audio_version_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM audio_versions
    WHERE id = NEW.audio_version_id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Update media_files_verses.project_id when media_files.project_id changes
CREATE OR REPLACE FUNCTION update_media_files_verses_project_id_from_media_file () returns trigger AS $$
BEGIN
  -- Update all media_files_verses when media_file.project_id changes
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE media_files_verses
    SET project_id = NEW.project_id
    WHERE media_file_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Set media_files_verses.project_id from media_file on insert/update
CREATE OR REPLACE FUNCTION set_media_files_verses_project_id_from_media_file () returns trigger AS $$
BEGIN
  -- Get project_id from media_file
  IF NEW.media_file_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM media_files
    WHERE id = NEW.media_file_id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Update sequences_segments.project_id when sequences.project_id changes
CREATE OR REPLACE FUNCTION update_sequences_segments_project_id_from_sequence () returns trigger AS $$
BEGIN
  -- Update all sequences_segments when sequence.project_id changes
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE sequences_segments
    SET project_id = NEW.project_id
    WHERE sequence_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Set sequences_segments.project_id from sequence on insert/update
CREATE OR REPLACE FUNCTION set_sequences_segments_project_id_from_sequence () returns trigger AS $$
BEGIN
  -- Get project_id from sequence
  IF NEW.sequence_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM sequences
    WHERE id = NEW.sequence_id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Update segments.project_id when sequences_segments.project_id changes
CREATE OR REPLACE FUNCTION update_segments_project_id_from_sequences_segments () returns trigger AS $$
BEGIN
  -- Update segment when sequences_segments.project_id changes
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE segments
    SET project_id = NEW.project_id
    WHERE id = NEW.segment_id;
  END IF;
  
  -- Handle INSERT: segments will set project_id via their own trigger
  -- Handle DELETE: No action needed (segment can belong to multiple sequences_segments)
  
  RETURN NEW;
END;
$$ language plpgsql;


-- Function: Set segments.project_id from sequences_segments on insert/update
-- Note: A segment can belong to multiple sequences_segments, so we use the first one found
CREATE OR REPLACE FUNCTION set_segments_project_id_from_sequences_segments () returns trigger AS $$
BEGIN
  -- Get project_id from first sequences_segments entry
  IF NEW.id IS NOT NULL THEN
    SELECT ss.project_id INTO NEW.project_id
    FROM sequences_segments ss
    WHERE ss.segment_id = NEW.id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


-- ============================================================================
-- 3. CREATE TRIGGERS
-- ============================================================================
-- Triggers for media_files.project_id
DROP TRIGGER if EXISTS trg_audio_versions_update_media_files_project_id ON audio_versions;


CREATE TRIGGER trg_audio_versions_update_media_files_project_id
AFTER
UPDATE of project_id ON audio_versions FOR each ROW
EXECUTE function update_media_files_project_id_from_audio_version ();


DROP TRIGGER if EXISTS trg_media_files_set_project_id ON media_files;


CREATE TRIGGER trg_media_files_set_project_id before insert
OR
UPDATE of audio_version_id ON media_files FOR each ROW
EXECUTE function set_media_files_project_id_from_audio_version ();


-- Triggers for media_files_verses.project_id
DROP TRIGGER if EXISTS trg_media_files_update_verses_project_id ON media_files;


CREATE TRIGGER trg_media_files_update_verses_project_id
AFTER
UPDATE of project_id ON media_files FOR each ROW
EXECUTE function update_media_files_verses_project_id_from_media_file ();


DROP TRIGGER if EXISTS trg_media_files_verses_set_project_id ON media_files_verses;


CREATE TRIGGER trg_media_files_verses_set_project_id before insert
OR
UPDATE of media_file_id ON media_files_verses FOR each ROW
EXECUTE function set_media_files_verses_project_id_from_media_file ();


-- Triggers for sequences_segments.project_id
DROP TRIGGER if EXISTS trg_sequences_update_segments_project_id ON sequences;


CREATE TRIGGER trg_sequences_update_segments_project_id
AFTER
UPDATE of project_id ON sequences FOR each ROW
EXECUTE function update_sequences_segments_project_id_from_sequence ();


DROP TRIGGER if EXISTS trg_sequences_segments_set_project_id ON sequences_segments;


CREATE TRIGGER trg_sequences_segments_set_project_id before insert
OR
UPDATE of sequence_id ON sequences_segments FOR each ROW
EXECUTE function set_sequences_segments_project_id_from_sequence ();


-- Triggers for segments.project_id
DROP TRIGGER if EXISTS trg_sequences_segments_update_segments_project_id ON sequences_segments;


CREATE TRIGGER trg_sequences_segments_update_segments_project_id
AFTER
UPDATE of project_id ON sequences_segments FOR each ROW
EXECUTE function update_segments_project_id_from_sequences_segments ();


DROP TRIGGER if EXISTS trg_segments_set_project_id ON segments;


CREATE TRIGGER trg_segments_set_project_id before insert
OR
UPDATE ON segments FOR each ROW
EXECUTE function set_segments_project_id_from_sequences_segments ();


-- ============================================================================
-- 4. BACKFILL EXISTING DATA
-- ============================================================================
-- Backfill media_files.project_id from audio_versions
UPDATE media_files
SET
  project_id = av.project_id
FROM
  audio_versions av
WHERE
  media_files.audio_version_id = av.id
  AND media_files.project_id IS NULL
  AND av.project_id IS NOT NULL;


-- Backfill media_files_verses.project_id from media_files
UPDATE media_files_verses
SET
  project_id = mf.project_id
FROM
  media_files mf
WHERE
  media_files_verses.media_file_id = mf.id
  AND media_files_verses.project_id IS NULL
  AND mf.project_id IS NOT NULL;


-- Backfill sequences_segments.project_id from sequences
UPDATE sequences_segments
SET
  project_id = s.project_id
FROM
  sequences s
WHERE
  sequences_segments.sequence_id = s.id
  AND sequences_segments.project_id IS NULL
  AND s.project_id IS NOT NULL;


-- Backfill segments.project_id from sequences_segments (use first one found)
UPDATE segments seg
SET
  project_id = (
    SELECT
      ss.project_id
    FROM
      sequences_segments ss
    WHERE
      ss.segment_id = seg.id
      AND ss.project_id IS NOT NULL
    LIMIT
      1
  )
WHERE
  seg.project_id IS NULL;


-- ============================================================================
-- 5. SIMPLIFY resolve_project_id FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_project_id (p_table_name TEXT, p_record_id UUID) returns UUID language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_project_id UUID;
BEGIN
  CASE p_table_name
    WHEN 'projects' THEN
      SELECT id INTO v_project_id FROM public.projects WHERE id = p_record_id;
    
    WHEN 'audio_versions' THEN
      SELECT project_id INTO v_project_id FROM public.audio_versions WHERE id = p_record_id;
    
    WHEN 'text_versions' THEN
      SELECT project_id INTO v_project_id FROM public.text_versions WHERE id = p_record_id;
    
    WHEN 'sequences' THEN
      SELECT project_id INTO v_project_id FROM public.sequences WHERE id = p_record_id;
    
    WHEN 'project_updates' THEN
      SELECT project_id INTO v_project_id FROM public.project_updates WHERE id = p_record_id;
    
    -- Now using denormalized project_id directly
    WHEN 'media_files' THEN
      SELECT project_id INTO v_project_id FROM public.media_files WHERE id = p_record_id;
    
    WHEN 'media_files_verses' THEN
      SELECT project_id INTO v_project_id FROM public.media_files_verses WHERE id = p_record_id;
    
    WHEN 'verse_texts' THEN
      SELECT tv.project_id INTO v_project_id
      FROM public.verse_texts vt
      JOIN public.text_versions tv ON tv.id = vt.text_version_id
      WHERE vt.id = p_record_id;
    
    WHEN 'project_updates_media' THEN
      SELECT pu.project_id INTO v_project_id
      FROM public.project_updates_media pum
      JOIN public.project_updates pu ON pu.id = pum.project_update_id
      WHERE pum.id = p_record_id;
    
    -- Now using denormalized project_id directly
    WHEN 'sequences_segments' THEN
      SELECT project_id INTO v_project_id FROM public.sequences_segments WHERE id = p_record_id;
    
    WHEN 'verse_feedback' THEN
      SELECT av.project_id INTO v_project_id
      FROM public.verse_feedback vf
      JOIN public.media_files mf ON mf.id = vf.media_files_id
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE vf.id = p_record_id;
    
    -- Now using denormalized project_id directly
    WHEN 'segments' THEN
      SELECT project_id INTO v_project_id FROM public.segments WHERE id = p_record_id;
    
    ELSE
      RETURN NULL;
  END CASE;
  
  RETURN v_project_id;
END;
$$;


-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON COLUMN sequences.upload_status IS 'Upload status for the sequence';


comment ON COLUMN sequences.publish_status IS 'Publishing status for the sequence';


comment ON COLUMN sequences.check_status IS 'Check/review status for the sequence';


comment ON COLUMN sequences.chapter_id IS 'Optional reference to the chapter this sequence represents';


comment ON COLUMN sequences_segments.is_hidden IS 'Whether this segment is hidden from view';


comment ON COLUMN sequences_segments.verse_number IS 'Verse number for this segment';


comment ON COLUMN sequences_segments.project_id IS 'Denormalized project_id from sequences table (maintained by triggers)';


comment ON COLUMN media_files.sequence_id IS 'Optional reference to the sequence this media file belongs to';


comment ON COLUMN media_files.project_id IS 'Denormalized project_id from audio_versions table (maintained by triggers)';


comment ON COLUMN media_files_verses.verse_checker_status IS 'Status set by verse checker';


comment ON COLUMN media_files_verses.verse_checker_comment IS 'Comment from verse checker';


comment ON COLUMN media_files_verses.project_id IS 'Denormalized project_id from media_files table (maintained by triggers)';


comment ON COLUMN segments.project_id IS 'Denormalized project_id from sequences_segments table (maintained by triggers)';


comment ON COLUMN projects.region_name IS 'Denormalized region name for display';


comment ON COLUMN projects.source_language_name IS 'Denormalized source language name for display';


comment ON COLUMN projects.target_language_name IS 'Denormalized target language name for display';

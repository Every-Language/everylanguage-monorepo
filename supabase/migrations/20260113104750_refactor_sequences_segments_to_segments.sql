-- Refactor sequences_segments junction table into direct relationship
-- Migration: 20260113104750_refactor_sequences_segments_to_segments.sql
-- 
-- This migration:
-- 1. Migrates data from sequences_segments to segments
-- 2. Adds sequence_id, segment_index, segment_color, is_deleted, is_numbered to segments
-- 3. Removes local_path and remote_path from segments, adds storage_provider, object_key, original_filename, file_type
-- 4. Removes local_path from media_files (if still exists)
-- 5. Updates triggers to denormalize project_id from sequences to segments
-- 6. Drops sequences_segments table and related triggers/functions
-- 7. Updates RLS policies to work with segments directly
-- ============================================================================
-- ============================================================================
-- STEP 1: ADD NEW COLUMNS TO SEGMENTS TABLE
-- ============================================================================
DO $$
BEGIN
  -- Add sequence_id (NOT NULL after data migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'sequence_id'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_segments_sequence_id 
    ON public.segments (sequence_id)
    WHERE sequence_id IS NOT NULL;
  END IF;

  -- Add segment_index
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'segment_index'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN segment_index INTEGER CHECK (segment_index >= 0);
    
    CREATE INDEX IF NOT EXISTS idx_segments_segment_index 
    ON public.segments (segment_index)
    WHERE segment_index IS NOT NULL;
  END IF;

  -- Add segment_color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'segment_color'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN segment_color TEXT;
  END IF;

  -- Add is_deleted
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_segments_is_deleted 
    ON public.segments (is_deleted)
    WHERE is_deleted = TRUE;
  END IF;

  -- Add is_numbered
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'is_numbered'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN is_numbered BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add storage_provider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'storage_provider'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN storage_provider TEXT DEFAULT 'r2';
  END IF;

  -- Add object_key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'object_key'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN object_key TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_segments_object_key 
    ON public.segments (object_key)
    WHERE object_key IS NOT NULL;
  END IF;

  -- Add original_filename
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'original_filename'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN original_filename TEXT;
  END IF;

  -- Add file_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'segments' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE public.segments 
    ADD COLUMN file_type TEXT;
  END IF;
END $$;


-- ============================================================================
-- STEP 2: BACKFILL STORAGE FIELDS FROM remote_path (before dropping columns)
-- ============================================================================
-- Backfill object_key, original_filename, and file_type from remote_path if it exists
UPDATE public.segments
SET
  object_key = CASE
    WHEN remote_path IS NOT NULL
    AND POSITION('/' IN remote_path) > 0 THEN REGEXP_REPLACE(remote_path, '.*/', '')
    WHEN remote_path IS NOT NULL THEN remote_path
    ELSE NULL
  END,
  storage_provider = COALESCE(storage_provider, 'r2'),
  original_filename = CASE
    WHEN remote_path IS NOT NULL
    AND POSITION('/' IN remote_path) > 0 THEN REGEXP_REPLACE(remote_path, '.*/', '')
    WHEN remote_path IS NOT NULL THEN remote_path
    ELSE NULL
  END,
  file_type = CASE
    WHEN remote_path IS NOT NULL
    AND remote_path ~ '\.' THEN LOWER(REGEXP_REPLACE(remote_path, '.*\.', ''))
    ELSE NULL
  END
WHERE
  object_key IS NULL
  AND remote_path IS NOT NULL;


-- ============================================================================
-- STEP 3: REMOVE OLD PATH COLUMNS
-- ============================================================================
-- Remove local_path and remote_path from segments
ALTER TABLE public.segments
DROP COLUMN IF EXISTS local_path,
DROP COLUMN IF EXISTS remote_path;


-- Remove local_path from media_files (if still exists - should have been removed in 20250724115034)
ALTER TABLE public.media_files
DROP COLUMN IF EXISTS local_path;


-- ============================================================================
-- STEP 4: MIGRATE DATA FROM sequences_segments TO segments
-- ============================================================================
-- Strategy: For segments that appear in multiple sequences_segments, we create
-- duplicate segment records (one per sequence). This changes from many-to-many
-- to one-to-many relationship.
-- First, update segments that appear in only one sequence_segments entry
UPDATE public.segments seg
SET
  sequence_id = ss.sequence_id,
  segment_index = ss.segment_index,
  segment_color = ss.segment_color,
  is_deleted = COALESCE(ss.is_deleted, FALSE),
  is_numbered = COALESCE(ss.is_numbered, TRUE),
  project_id = COALESCE(ss.project_id, s.project_id)
FROM
  public.sequences_segments ss
  JOIN public.sequences s ON s.id = ss.sequence_id
WHERE
  seg.id = ss.segment_id
  AND seg.sequence_id IS NULL
  AND ss.segment_id IN (
    -- Only segments that appear in exactly one sequence_segments entry
    SELECT
      segment_id
    FROM
      public.sequences_segments
    GROUP BY
      segment_id
    HAVING
      COUNT(*) = 1
  );


-- For segments that appear in multiple sequences_segments:
-- 1. Update the original segment with the first sequence (by created_at)
UPDATE public.segments seg
SET
  sequence_id = ss.sequence_id,
  segment_index = ss.segment_index,
  segment_color = ss.segment_color,
  is_deleted = COALESCE(ss.is_deleted, FALSE),
  is_numbered = COALESCE(ss.is_numbered, TRUE),
  project_id = COALESCE(ss.project_id, s.project_id)
FROM
  (
    SELECT DISTINCT
      ON (ss.segment_id) ss.segment_id,
      ss.sequence_id,
      ss.segment_index,
      ss.segment_color,
      ss.is_deleted,
      ss.is_numbered,
      ss.project_id
    FROM
      public.sequences_segments ss
    WHERE
      ss.segment_id IN (
        SELECT
          segment_id
        FROM
          public.sequences_segments
        GROUP BY
          segment_id
        HAVING
          COUNT(*) > 1
      )
    ORDER BY
      ss.segment_id,
      ss.created_at
  ) ss
  JOIN public.sequences s ON s.id = ss.sequence_id
WHERE
  seg.id = ss.segment_id
  AND seg.sequence_id IS NULL;


-- 2. Create duplicate segments for remaining sequences
INSERT INTO
  public.segments (
    type,
    created_at,
    created_by,
    updated_at,
    deleted_at,
    sequence_id,
    segment_index,
    segment_color,
    is_deleted,
    is_numbered,
    project_id,
    storage_provider,
    object_key,
    original_filename,
    file_type
  )
SELECT
  seg.type,
  ss.created_at,
  seg.created_by,
  ss.updated_at,
  seg.deleted_at,
  ss.sequence_id,
  ss.segment_index,
  ss.segment_color,
  COALESCE(ss.is_deleted, FALSE),
  COALESCE(ss.is_numbered, TRUE),
  COALESCE(ss.project_id, s.project_id),
  COALESCE(seg.storage_provider, 'r2'),
  seg.object_key,
  seg.original_filename,
  seg.file_type
FROM
  public.sequences_segments ss
  JOIN public.segments seg ON seg.id = ss.segment_id
  JOIN public.sequences s ON s.id = ss.sequence_id
WHERE
  ss.segment_id IN (
    SELECT
      segment_id
    FROM
      public.sequences_segments
    GROUP BY
      segment_id
    HAVING
      COUNT(*) > 1
  )
  AND ss.sequence_id != seg.sequence_id;


-- Only sequences different from the one already assigned
-- Now set sequence_id to NOT NULL and add constraints
ALTER TABLE public.segments
ALTER COLUMN sequence_id
SET NOT NULL,
ADD CONSTRAINT segments_sequence_id_segment_index_unique UNIQUE (sequence_id, segment_index);


-- ============================================================================
-- STEP 5: DROP OLD TRIGGERS AND FUNCTIONS RELATED TO sequences_segments
-- ============================================================================
-- Drop triggers first (they depend on the functions)
DROP TRIGGER if EXISTS trg_sequences_update_segments_project_id ON sequences;


DROP TRIGGER if EXISTS trg_sequences_segments_set_project_id ON sequences_segments;


DROP TRIGGER if EXISTS trg_sequences_segments_update_segments_project_id ON sequences_segments;


DROP TRIGGER if EXISTS trg_segments_set_project_id ON segments;


-- Now drop the functions
DROP FUNCTION if EXISTS update_sequences_segments_project_id_from_sequence ();


DROP FUNCTION if EXISTS set_sequences_segments_project_id_from_sequence ();


DROP FUNCTION if EXISTS update_segments_project_id_from_sequences_segments ();


DROP FUNCTION if EXISTS set_segments_project_id_from_sequences_segments ();


-- ============================================================================
-- STEP 6: CREATE NEW TRIGGER FUNCTIONS FOR SEGMENTS
-- ============================================================================
-- Function: Update segments.project_id when sequences.project_id changes
-- Uses SECURITY DEFINER to bypass RLS so denormalization always works
CREATE OR REPLACE FUNCTION update_segments_project_id_from_sequence () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Update all segments when sequence.project_id changes
  -- SECURITY DEFINER allows this to bypass RLS when updating segments
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE segments
    SET project_id = NEW.project_id
    WHERE sequence_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function update_segments_project_id_from_sequence () IS 'Updates all segments.project_id when sequences.project_id changes. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- Function: Set segments.project_id from sequence on insert/update
-- Uses SECURITY DEFINER to bypass RLS so denormalization always works
CREATE OR REPLACE FUNCTION set_segments_project_id_from_sequence () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Get project_id from sequence
  -- SECURITY DEFINER allows this to bypass RLS on sequences
  IF NEW.sequence_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM sequences
    WHERE id = NEW.sequence_id;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function set_segments_project_id_from_sequence () IS 'Sets segments.project_id from sequences.project_id. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- ============================================================================
-- STEP 7: CREATE NEW TRIGGERS
-- ============================================================================
-- Trigger: Update segments.project_id when sequences.project_id changes
CREATE TRIGGER trg_sequences_update_segments_project_id
AFTER
UPDATE of project_id ON sequences FOR each ROW
EXECUTE function update_segments_project_id_from_sequence ();


-- Trigger: Set segments.project_id from sequence on insert/update
CREATE TRIGGER trg_segments_set_project_id_from_sequence before insert
OR
UPDATE of sequence_id ON segments FOR each ROW
EXECUTE function set_segments_project_id_from_sequence ();


-- ============================================================================
-- STEP 8: DROP sequences_segments TABLE AND RELATED OBJECTS
-- ============================================================================
-- Drop RLS policies first
DROP POLICY if EXISTS sequences_segments_select ON public.sequences_segments;


DROP POLICY if EXISTS sequences_segments_insert ON public.sequences_segments;


DROP POLICY if EXISTS sequences_segments_update ON public.sequences_segments;


DROP POLICY if EXISTS sequences_segments_delete ON public.sequences_segments;


-- Drop indexes
DROP INDEX if EXISTS idx_sequences_segments_sequence_id;


DROP INDEX if EXISTS idx_sequences_segments_segment_id;


DROP INDEX if EXISTS idx_sequences_segments_segment_index;


DROP INDEX if EXISTS idx_sequences_segments_is_deleted;


DROP INDEX if EXISTS idx_sequences_segments_is_hidden;


DROP INDEX if EXISTS idx_sequences_segments_verse_number;


DROP INDEX if EXISTS idx_sequences_segments_project_id;


DROP INDEX if EXISTS idx_sequences_segments_created_by;


-- Drop triggers
DROP TRIGGER if EXISTS update_sequences_segments_updated_at ON public.sequences_segments;


-- Drop the table (CASCADE will handle foreign key constraints)
DROP TABLE IF EXISTS public.sequences_segments cascade;


-- ============================================================================
-- STEP 9: UPDATE COMMENTS
-- ============================================================================
comment ON COLUMN segments.sequence_id IS 'Sequence this segment belongs to (one-to-many relationship)';


comment ON COLUMN segments.segment_index IS 'Order of segment within sequence (0-based)';


comment ON COLUMN segments.segment_color IS 'Color coding for segment visualization';


comment ON COLUMN segments.is_deleted IS 'Soft delete flag for segments';


comment ON COLUMN segments.is_numbered IS 'Whether segment should be numbered in UI';


comment ON COLUMN segments.project_id IS 'Denormalized project_id from sequences table (maintained by triggers)';


comment ON COLUMN segments.storage_provider IS 'Storage provider for the segment file (e.g., r2, s3)';


comment ON COLUMN segments.object_key IS 'Object key/path in storage provider';


comment ON COLUMN segments.original_filename IS 'Original filename when uploaded';


comment ON COLUMN segments.file_type IS 'File type/extension (e.g., mp3, wav)';


-- ============================================================================
-- STEP 10: UPDATE resolve_project_id FUNCTION
-- ============================================================================
-- Remove sequences_segments case since table no longer exists
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
    WHEN 'segments' THEN
      SELECT project_id INTO v_project_id FROM public.segments WHERE id = p_record_id;
    
    WHEN 'verse_feedback' THEN
      SELECT av.project_id INTO v_project_id
      FROM public.verse_feedback vf
      JOIN public.media_files mf ON mf.id = vf.media_files_id
      JOIN public.audio_versions av ON av.id = mf.audio_version_id
      WHERE vf.id = p_record_id;
    
    ELSE
      RETURN NULL;
  END CASE;
  
  RETURN v_project_id;
END;
$$;

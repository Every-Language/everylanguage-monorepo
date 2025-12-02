-- Fix media_files RLS policy and make project_id denormalization triggers SECURITY DEFINER
-- Migration: 20251226000045_fix_media_files_rls_and_project_id_triggers.sql
-- 
-- Problem:
-- - media_files INSERT RLS policy queries audio_versions table, which can fail due to RLS
-- - Trigger functions that denormalize project_id are SECURITY INVOKER, so they're subject to RLS
-- - This can cause project_id to not be set, causing INSERT to fail
--
-- Solution:
-- 1. Make all project_id denormalization trigger functions SECURITY DEFINER
--    so they can always read/write the denormalized columns regardless of RLS
-- 2. Update media_files INSERT policy to use project_id directly instead of querying audio_versions
--
-- ============================================================================
-- UPDATE TRIGGER FUNCTIONS TO SECURITY DEFINER
-- ============================================================================
-- Function: Set media_files.project_id from audio_version on insert/update
CREATE OR REPLACE FUNCTION public.set_media_files_project_id_from_audio_version () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Get project_id from audio_version
  -- SECURITY DEFINER allows this to bypass RLS on audio_versions
  IF NEW.audio_version_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM audio_versions
    WHERE id = NEW.audio_version_id;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.set_media_files_project_id_from_audio_version () IS 'Sets media_files.project_id from audio_versions.project_id. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- Function: Update media_files.project_id when audio_versions.project_id changes
CREATE OR REPLACE FUNCTION public.update_media_files_project_id_from_audio_version () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Update all media_files when audio_version.project_id changes
  -- SECURITY DEFINER allows this to bypass RLS when updating media_files
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE media_files
    SET project_id = NEW.project_id
    WHERE audio_version_id = NEW.id;
  END IF;
  
  -- Handle INSERT: media_files will set project_id via their own trigger
  -- Handle DELETE: CASCADE will handle it
  
  RETURN NEW;
END;
$$;


comment ON function public.update_media_files_project_id_from_audio_version () IS 'Updates all media_files.project_id when audio_versions.project_id changes. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- Function: Set media_files_verses.project_id from media_file on insert/update
CREATE OR REPLACE FUNCTION public.set_media_files_verses_project_id_from_media_file () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Get project_id from media_file
  -- SECURITY DEFINER allows this to bypass RLS on media_files
  IF NEW.media_file_id IS NOT NULL THEN
    SELECT project_id INTO NEW.project_id
    FROM media_files
    WHERE id = NEW.media_file_id;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.set_media_files_verses_project_id_from_media_file () IS 'Sets media_files_verses.project_id from media_files.project_id. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- Function: Update media_files_verses.project_id when media_files.project_id changes
CREATE OR REPLACE FUNCTION public.update_media_files_verses_project_id_from_media_file () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Update all media_files_verses when media_file.project_id changes
  -- SECURITY DEFINER allows this to bypass RLS when updating media_files_verses
  IF TG_OP = 'UPDATE' AND (OLD.project_id IS DISTINCT FROM NEW.project_id) THEN
    UPDATE media_files_verses
    SET project_id = NEW.project_id
    WHERE media_file_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.update_media_files_verses_project_id_from_media_file () IS 'Updates all media_files_verses.project_id when media_files.project_id changes. Uses SECURITY DEFINER to bypass RLS so denormalization always works.';


-- ============================================================================
-- UPDATE MEDIA_FILES INSERT RLS POLICY
-- ============================================================================
-- Drop old policy that queries audio_versions
DROP POLICY if EXISTS media_files_ins_with_project_write ON public.media_files;


-- Create new policy that uses project_id directly
-- project_id is set by BEFORE INSERT trigger, so it's available in WITH CHECK
CREATE POLICY media_files_ins_with_project_write ON public.media_files FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND project_id IS NOT NULL -- Ensures trigger set it successfully
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


comment ON policy media_files_ins_with_project_write ON public.media_files IS 'Allows users with project.write permission to insert media_files. Uses project_id directly (set by trigger) instead of querying audio_versions to avoid RLS recursion issues.';

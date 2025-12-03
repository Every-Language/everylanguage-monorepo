-- Revert media_files INSERT policy to check audio_versions directly
-- Migration: 20251226000046_revert_media_files_policy_to_check_audio_versions.sql
-- 
-- Problem:
-- - The policy was changed to use project_id directly (set by trigger)
-- - But project_id may not be set when WITH CHECK runs, causing INSERT to fail
-- - Since there's no media_file record yet during INSERT, we need to check audio_versions
--
-- Solution:
-- - Revert to checking audio_versions directly in the policy
-- - Users with project.read can query audio_versions, so this works
-- - This avoids dependency on trigger setting project_id before WITH CHECK runs
--
-- ============================================================================
-- REVERT MEDIA_FILES INSERT POLICY
-- ============================================================================
DROP POLICY if EXISTS media_files_ins_with_project_write ON public.media_files;


-- Revert to checking audio_versions directly
-- This works because:
-- 1. Users with project.write have project.read (can query audio_versions)
-- 2. No dependency on trigger setting project_id
-- 3. audio_version_id is provided in the INSERT, so we can check it
CREATE POLICY media_files_ins_with_project_write ON public.media_files FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.audio_versions av
      WHERE
        av.id = media_files.audio_version_id
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          av.project_id
        )
    )
  );


comment ON policy media_files_ins_with_project_write ON public.media_files IS 'Allows users with project.write permission to insert media_files. Checks audio_versions directly since there is no media_file record yet during INSERT. Users with project.write have project.read, so they can query audio_versions.';

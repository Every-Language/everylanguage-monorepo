-- Fix media_files INSERT RLS policy to use project_id directly
-- Migration: 20251226000047_fix_media_files_insert_rls_use_project_id.sql
-- 
-- Problem:
-- - Current policy queries audio_versions table in EXISTS subquery
-- - This is subject to RLS on audio_versions, which can block the query
-- - Even though users have project.write permission, RLS on audio_versions blocks the EXISTS check
--
-- Solution:
-- - Change policy to check project_id directly (provided in INSERT or set by trigger)
-- - Frontend will provide project_id in INSERT statement
-- - Trigger will still set project_id as a safety net/validation
-- - This avoids querying audio_versions in the policy, eliminating RLS blocking issues
--
-- ============================================================================
-- UPDATE MEDIA_FILES INSERT RLS POLICY
-- ============================================================================
DROP POLICY if EXISTS media_files_ins_with_project_write ON public.media_files;


-- Create new policy that uses project_id directly
-- project_id can be provided in INSERT statement or set by BEFORE INSERT trigger
-- Either way, it's available when WITH CHECK runs
CREATE POLICY media_files_ins_with_project_write ON public.media_files FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND project_id IS NOT NULL -- Ensures project_id is set (by INSERT or trigger)
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


comment ON policy media_files_ins_with_project_write ON public.media_files IS 'Allows users with project.write permission to insert media_files. Uses project_id directly (provided in INSERT or set by trigger) instead of querying audio_versions to avoid RLS blocking issues.';

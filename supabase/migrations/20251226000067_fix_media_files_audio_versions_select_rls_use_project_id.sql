-- Fix media_files and audio_versions SELECT RLS policies to use project_id directly
-- Migration: 20251226000067_fix_media_files_audio_versions_select_rls_use_project_id.sql
--
-- Problem:
-- - media_files and audio_versions SELECT policies use resolve_project_id() function
-- - resolve_project_id() queries the same table, causing RLS recursion issues
-- - When using .insert().select(), the SELECT policy fails with RLS violation
-- - This happens because resolve_project_id() is SECURITY DEFINER but doesn't disable row_security
--
-- Solution:
-- - Update SELECT policies to use denormalized project_id column directly
-- - For media_files: project_id is set by BEFORE INSERT trigger from audio_versions
-- - For audio_versions: project_id is set directly on INSERT
-- - Both project_id values are available immediately for policy evaluation
--
-- ============================================================================
-- FIX MEDIA_FILES SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS media_files_select_inherit_project ON public.media_files;


CREATE POLICY media_files_select_inherit_project ON public.media_files FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use denormalized project_id directly instead of resolve_project_id()
    )
  );


comment ON policy media_files_select_inherit_project ON public.media_files IS 'Allows users to select published media_files or media_files for projects they have read access to. Uses denormalized project_id to avoid RLS recursion with resolve_project_id().';


-- ============================================================================
-- FIX AUDIO_VERSIONS SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS audio_versions_select_inherit_project ON public.audio_versions;


CREATE POLICY audio_versions_select_inherit_project ON public.audio_versions FOR
SELECT
  USING (
    (publish_status = 'published')
    OR public.has_permission (
      auth.uid (),
      'project.read',
      'project',
      project_id -- Use project_id directly instead of resolve_project_id()
    )
  );


comment ON policy audio_versions_select_inherit_project ON public.audio_versions IS 'Allows users to select published audio_versions or audio_versions for projects they have read access to. Uses project_id directly to avoid RLS recursion with resolve_project_id().';

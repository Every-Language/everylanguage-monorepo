-- Allow soft delete via UPDATE policy instead of separate DELETE policy
-- Migration: 20251226000071_allow_soft_delete_via_update_policy.sql
--
-- Problem:
-- - Separate DELETE policies require project.delete permission to soft delete
-- - This is unnecessary - anyone with UPDATE/write permission should be able to soft delete
-- - Having two UPDATE policies (one for regular updates, one for soft delete) is confusing
--
-- Solution:
-- - Remove the separate DELETE policies
-- - Update the UPDATE policies to allow setting deleted_at (remove deleted_at IS NULL from WITH CHECK)
-- - This allows anyone with UPDATE permission to soft delete by setting deleted_at
-- ============================================================================
-- ============================================================================
-- PROJECT_UPDATES TABLE
-- ============================================================================
-- Drop the separate DELETE policy
DROP POLICY if EXISTS project_updates_delete ON public.project_updates;


-- Update the UPDATE policy to allow setting deleted_at
DROP POLICY if EXISTS project_updates_update ON public.project_updates;


CREATE POLICY project_updates_update ON public.project_updates
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


comment ON policy project_updates_update ON public.project_updates IS 'Allows users with project.write permission to update project updates, including soft deleting by setting deleted_at. The USING clause ensures only non-deleted records can be updated, but the WITH CHECK clause allows setting deleted_at.';


-- ============================================================================
-- PROJECT_UPDATES_MEDIA TABLE
-- ============================================================================
-- Drop the separate DELETE policy
DROP POLICY if EXISTS project_updates_media_delete ON public.project_updates_media;


-- Update the UPDATE policy to allow setting deleted_at
DROP POLICY if EXISTS project_updates_media_update ON public.project_updates_media;


CREATE POLICY project_updates_media_update ON public.project_updates_media
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  );


comment ON policy project_updates_media_update ON public.project_updates_media IS 'Allows users with project.write permission to update project update media, including soft deleting by setting deleted_at. The USING clause ensures only non-deleted records can be updated, but the WITH CHECK clause allows setting deleted_at.';

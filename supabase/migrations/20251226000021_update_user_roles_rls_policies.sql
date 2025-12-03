-- Update user_roles RLS policies to use new column structure
-- Migration: 20251226000021_update_user_roles_rls_policies.sql
-- This migration updates all 4 RLS policies to use project_id, base_id, partner_org_id, is_global instead of context_type/context_id
-- ============================================================================
-- SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS user_roles_select_self_or_manager ON public.user_roles;


CREATE POLICY user_roles_select_self_or_manager ON public.user_roles FOR
SELECT
  USING (
    user_id = auth.uid ()
    OR (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        project_id
      )
    )
    OR (
      base_id IS NOT NULL
      AND public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
    )
    OR (
      partner_org_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        partner_org_id
      )
    )
    OR is_global = TRUE
  );


-- ============================================================================
-- INSERT POLICY
-- ============================================================================
DROP POLICY if EXISTS user_roles_insert_with_manage ON public.user_roles;


CREATE POLICY user_roles_insert_with_manage ON public.user_roles FOR insert
WITH
  CHECK (
    (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        project_id
      )
    )
    OR (
      base_id IS NOT NULL
      AND public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
    )
    OR (
      partner_org_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        partner_org_id
      )
    )
    OR is_global = TRUE
  );


-- ============================================================================
-- UPDATE POLICY
-- ============================================================================
DROP POLICY if EXISTS user_roles_update_with_manage ON public.user_roles;


CREATE POLICY user_roles_update_with_manage ON public.user_roles
FOR UPDATE
  USING (
    (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        project_id
      )
    )
    OR (
      base_id IS NOT NULL
      AND public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
    )
    OR (
      partner_org_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        partner_org_id
      )
    )
    OR is_global = TRUE
  )
WITH
  CHECK (
    (
      project_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        project_id
      )
    )
    OR (
      base_id IS NOT NULL
      AND public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
    )
    OR (
      partner_org_id IS NOT NULL
      AND public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        partner_org_id
      )
    )
    OR is_global = TRUE
  );


-- ============================================================================
-- DELETE POLICY
-- ============================================================================
DROP POLICY if EXISTS user_roles_delete_with_manage ON public.user_roles;


CREATE POLICY user_roles_delete_with_manage ON public.user_roles FOR delete USING (
  (
    project_id IS NOT NULL
    AND public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      project_id
    )
  )
  OR (
    base_id IS NOT NULL
    AND public.has_permission (auth.uid (), 'base.manage_roles', 'base', base_id)
  )
  OR (
    partner_org_id IS NOT NULL
    AND public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      partner_org_id
    )
  )
  OR is_global = TRUE
);

-- Fix RLS issues for sequences and projects tables
-- Migration: 20251226000025_fix_sequences_and_projects_rls.sql
-- ============================================================================
-- ISSUE 1: sequences table RLS is disabled
-- ISSUE 2: sequences INSERT policy allows any authenticated user
-- ISSUE 3: projects INSERT policy missing permission check
-- ============================================================================
-- ============================================================================
-- SEQUENCES TABLE - Enable RLS and fix INSERT policy
-- ============================================================================
-- Enable RLS on sequences table (it was disabled somehow)
ALTER TABLE public.sequences enable ROW level security;


-- Drop the old incorrect INSERT policy
DROP POLICY if EXISTS "Enable insert for authenticated users only" ON public.sequences;


DROP POLICY if EXISTS "Users can insert sequences" ON public.sequences;


DROP POLICY if EXISTS sequences_insert ON public.sequences;


-- Create correct INSERT policy with has_permission check
CREATE POLICY sequences_insert ON public.sequences FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id
    )
  );


-- ============================================================================
-- PROJECTS TABLE - Add permission check to INSERT policy
-- ============================================================================
-- Drop existing INSERT policy
DROP POLICY if EXISTS projects_insert_with_permission ON public.projects;


-- Create new INSERT policy with permission check
-- Projects can be created by:
-- 1. System admins (global permission)
-- 2. Base admins (base.manage_roles permission on any base)
-- Note: We check for base.manage_roles on any base since projects are linked
-- to bases via bases_projects table, and base admins should be able to create
-- projects for their bases.
CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND (
      -- System admin can create projects
      public.has_permission (
        auth.uid (),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL::UUID
      )
      OR
      -- Base admin can create projects (check if user has base.manage_roles on any base)
      EXISTS (
        SELECT
          1
        FROM
          public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        WHERE
          ur.user_id = auth.uid ()
          AND ur.base_id IS NOT NULL
          AND rp.resource_type = 'base'::resource_type
          AND rp.permission_key = 'base.manage_roles'::permission_key
          AND rp.is_allowed = TRUE
        LIMIT
          1
      )
    )
  );

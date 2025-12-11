-- Fix projects SELECT RLS policy to allow creators to read their own projects
-- Migration: 20251226000095_fix_projects_select_rls_allow_creators.sql
-- ============================================================================
-- ISSUE: When inserting a project with .select(), PostgreSQL evaluates the SELECT
--        policy on the newly inserted row. New projects have publish_status='pending'
--        and the creator doesn't have project.read permission yet (trigger assigns
--        role AFTER INSERT). This causes the SELECT policy to fail during INSERT.
-- SOLUTION: Add ownership check (created_by = auth.uid()) to SELECT policy so
--           creators can always read their own projects, even before role assignment.
-- ============================================================================
-- Drop existing SELECT policy
DROP POLICY if EXISTS projects_select_public ON public.projects;


-- Create new SELECT policy that allows:
-- 1. Published projects (publicly readable)
-- 2. Projects created by the current user (ownership-based access)
-- 3. Projects where user has project.read permission (permission-based access)
CREATE POLICY projects_select_public ON public.projects FOR
SELECT
  USING (
    (publish_status = 'published'::publish_status)
    OR (created_by = auth.uid ())
    OR public.has_permission (
      auth.uid (),
      'project.read'::permission_key,
      'project'::resource_type,
      id
    )
  );

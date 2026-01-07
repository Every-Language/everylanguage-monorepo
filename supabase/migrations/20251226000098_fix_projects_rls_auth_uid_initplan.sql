-- Fix RLS Auth Initialization Plan Issues for Projects Table
-- Migration: 20251226000098_fix_projects_rls_auth_uid_initplan.sql
-- ============================================================================
-- This migration fixes the projects table policies that were re-introduced
-- by migrations 20251226000094 and 20251226000095 with direct auth.uid() calls.
-- 
-- These migrations run AFTER 20251226000097_fix_rls_auth_uid_initplan.sql,
-- which means they overwrote the optimized policies with direct auth.uid() calls.
-- 
-- This migration ensures all projects table policies use (select auth.uid())
-- to prevent PostgreSQL initialization plan creation on each policy evaluation.
-- ============================================================================
-- Fix projects INSERT policy (from migration 20251226000094)
DROP POLICY if EXISTS projects_insert_with_permission ON public.projects;


CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH
  CHECK (
    created_by = (
      SELECT
        auth.uid ()
    )
  );


-- Fix projects SELECT policy (from migration 20251226000095)
DROP POLICY if EXISTS projects_select_public ON public.projects;


CREATE POLICY projects_select_public ON public.projects FOR
SELECT
  USING (
    (publish_status = 'published'::publish_status)
    OR (
      created_by = (
        SELECT
          auth.uid ()
      )
    )
    OR public.has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'project.read'::permission_key,
      'project'::resource_type,
      id
    )
  );

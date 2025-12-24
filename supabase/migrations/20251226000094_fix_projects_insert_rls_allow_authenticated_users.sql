-- Fix projects INSERT RLS policy to allow authenticated users to create projects
-- Migration: 20251226000094_fix_projects_insert_rls_allow_authenticated_users.sql
-- ============================================================================
-- ISSUE: The current RLS policy requires system admin or base admin permissions
--        to create projects, but there's a trigger that auto-assigns project_admin
--        role to creators AFTER INSERT. This creates a chicken-and-egg problem.
-- SOLUTION: Allow any authenticated user to create projects (with created_by = auth.uid())
--           The trigger will automatically grant them admin role after creation.
-- ============================================================================
-- Drop existing INSERT policy
DROP POLICY if EXISTS projects_insert_with_permission ON public.projects;


-- Create new INSERT policy that allows authenticated users to create projects
-- This policy ensures:
-- 1. Only authenticated users can create projects
-- 2. Users can only set themselves as the creator
-- 3. The trigger (assign_project_creator_role) will automatically assign
--    project_admin role to the creator after INSERT
CREATE POLICY projects_insert_with_permission ON public.projects FOR insert
WITH
  CHECK (created_by = auth.uid ());

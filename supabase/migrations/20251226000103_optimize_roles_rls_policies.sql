-- Optimize RLS policies on roles and role_permissions tables
-- Migration: 20251226000101_optimize_roles_rls_policies.sql
-- ============================================================================
-- This migration optimizes RLS policies by:
-- 1. Removing role_permissions_write_service_only policy (no longer needed)
-- 2. Removing roles_write_service_only policy (no longer needed)
-- 3. Updating role_permissions_select_allowed to only allow system admins
--    (removing service_role check for better security)
-- ============================================================================
-- Remove write policies that restrict to service_role only
-- These policies are no longer needed as writes should be handled via migrations
DROP POLICY if EXISTS role_permissions_write_service_only ON public.role_permissions;


DROP POLICY if EXISTS roles_write_service_only ON public.roles;


-- Update role_permissions SELECT policy to only allow system admins
-- Remove service_role check for better security - only system admins should read
DROP POLICY if EXISTS role_permissions_select_allowed ON public.role_permissions;


CREATE POLICY role_permissions_select_allowed ON public.role_permissions FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin',
      'global',
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );

-- Fix RLS infinite recursion in permission checking functions
-- Migration: 20251226000041_fix_rls_recursion_in_permission_functions.sql
-- 
-- This migration adds SET LOCAL row_security = off to has_permission() and check_project_permission()
-- functions to prevent infinite recursion when these functions query user_roles table.
--
-- Background:
-- - has_permission() and check_project_permission() query user_roles table
-- - user_roles RLS policies call has_permission() to check permissions
-- - This creates infinite recursion: has_permission() -> queries user_roles -> RLS checks has_permission() -> ...
--
-- Solution:
-- - Disable RLS within these SECURITY DEFINER functions using SET LOCAL row_security = off
-- - Change function volatility from STABLE to VOLATILE (required because SET LOCAL is a side effect)
-- - This is safe because:
--   1. Functions already run with SECURITY DEFINER (elevated privileges)
--   2. SET LOCAL only affects queries within the function execution
--   3. Security comes from the function itself, not RLS within it
--   4. This is a standard PostgreSQL pattern for permission-checking functions
-- Note: VOLATILE is acceptable here since permissions can change and the function needs to check current state
--
-- ============================================================================
-- UPDATE has_permission FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_permission (
  p_user_id UUID,
  p_action permission_key,
  p_resource_type resource_type,
  p_resource_id UUID
) returns BOOLEAN language plpgsql volatile security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Disable RLS for this function to prevent infinite recursion
  -- This is safe because the function is SECURITY DEFINER and already
  -- runs with elevated privileges. The security comes from the function
  -- itself, not from RLS within it.
  SET LOCAL row_security = off;

  -- 1) System admin shortcut
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_global = TRUE
      AND rp.resource_type = 'global'::resource_type
      AND rp.permission_key = 'system.admin'::permission_key
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 2) Check project permissions (for project resources or project child entities)
  IF p_resource_type = 'project'::resource_type THEN
    RETURN public.check_project_permission(p_user_id, p_action, p_resource_id);
  END IF;
  
  -- For project child entities, try to resolve project_id and check project permissions
  -- Note: This only works for resources that have a project_id relationship
  -- For INSERT operations, the calling code should pass the project_id directly
  v_project_id := public.resolve_project_id(p_resource_type::TEXT, p_resource_id);
  
  IF v_project_id IS NOT NULL THEN
    -- For verse_feedback actions, check both verse_feedback and project permissions
    IF p_action::TEXT LIKE 'verse_feedback.%' THEN
      -- Check verse_feedback permission first (direct role on project with verse_feedback permission)
      IF EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND ur.project_id = v_project_id
          AND rp.resource_type = 'project'::resource_type
          AND rp.permission_key = p_action
          AND rp.is_allowed = true
        LIMIT 1
      ) THEN
        RETURN true;
      END IF;
      
      -- Fall back to project permissions
      CASE p_action::TEXT
        WHEN 'verse_feedback.read' THEN
          RETURN public.check_project_permission(p_user_id, 'project.read'::permission_key, v_project_id);
        WHEN 'verse_feedback.write' THEN
          RETURN public.check_project_permission(p_user_id, 'project.write'::permission_key, v_project_id);
        WHEN 'verse_feedback.delete' THEN
          RETURN public.check_project_permission(p_user_id, 'project.delete'::permission_key, v_project_id);
        ELSE
          RETURN false;
      END CASE;
    ELSIF p_action::TEXT IN ('project.read', 'project.write', 'project.delete') THEN
      -- For other project child entities, map to project permissions
      RETURN public.check_project_permission(p_user_id, p_action, v_project_id);
    END IF;
  END IF;

  -- 3) Check direct role on resource
  IF p_resource_type = 'project'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.project_id = p_resource_id
        AND rp.resource_type = p_resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  ELSIF p_resource_type = 'base'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.base_id = p_resource_id
        AND rp.resource_type = p_resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  ELSIF p_resource_type = 'partner'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.partner_org_id = p_resource_id
        AND rp.resource_type = p_resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  ELSIF p_resource_type = 'global'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.is_global = TRUE
        AND rp.resource_type = p_resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;


-- ============================================================================
-- UPDATE check_project_permission FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_project_permission (
  p_user_id UUID,
  p_action permission_key,
  p_project_id UUID
) returns BOOLEAN language plpgsql volatile security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS for this function to prevent infinite recursion
  -- This is safe because the function is SECURITY DEFINER and already
  -- runs with elevated privileges. The security comes from the function
  -- itself, not from RLS within it.
  SET LOCAL row_security = off;

  -- 1) Direct role on project
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.project_id = p_project_id
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 2) Base-project inheritance
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_base
    JOIN public.bases_projects bp
      ON ur_base.base_id = bp.base_id
     AND bp.project_id = p_project_id
     AND bp.unassigned_at IS NULL
    JOIN public.role_permissions rp ON rp.role_id = ur_base.role_id
    WHERE ur_base.user_id = p_user_id
      AND ur_base.base_id IS NOT NULL
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 3) Partner-project inheritance
  -- Note: partner_orgs_projects is now a table, so we need to filter unassigned_at IS NULL
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_partner
    JOIN public.partner_orgs_projects pop
      ON ur_partner.partner_org_id = pop.partner_org_id
     AND pop.project_id = p_project_id
     AND pop.unassigned_at IS NULL
    JOIN public.role_permissions rp ON rp.role_id = ur_partner.role_id
    WHERE ur_partner.user_id = p_user_id
      AND ur_partner.partner_org_id IS NOT NULL
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;


-- Update function comments to document the RLS bypass
comment ON function public.has_permission (UUID, permission_key, resource_type, UUID) IS 'Checks if a user has a specific permission. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion when called from within RLS policies. RLS is disabled within this function using SET LOCAL row_security = off to prevent recursion when querying user_roles table.';


comment ON function public.check_project_permission (UUID, permission_key, UUID) IS 'Checks if a user has a specific permission for a project, including inheritance from bases and partner orgs. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion when called from within RLS policies. RLS is disabled within this function using SET LOCAL row_security = off to prevent recursion when querying user_roles table.';

-- Fix infinite recursion in user_roles RLS policies
-- Migration: 20251226000043_fix_user_roles_rls_policies_recursion.sql
-- 
-- The policies user_roles_select_base_members, user_roles_select_partner_members,
-- and user_roles_select_project_members query user_roles directly, causing recursion.
-- 
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS to check membership,
-- then update the policies to use these functions instead of direct queries.
-- ============================================================================
-- CREATE HELPER FUNCTIONS TO CHECK MEMBERSHIP WITHOUT RLS RECURSION
-- ============================================================================
-- Check if current user is a member of a base
CREATE OR REPLACE FUNCTION public.is_base_member (p_base_id UUID) returns BOOLEAN language plpgsql volatile security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS to prevent recursion when checking membership
  -- VOLATILE is required because SET LOCAL is a side effect
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.base_id = p_base_id
      AND ur.base_id IS NOT NULL
  );
END;
$$;


-- Check if current user is a member of a partner org
CREATE OR REPLACE FUNCTION public.is_partner_org_member (p_partner_org_id UUID) returns BOOLEAN language plpgsql volatile security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS to prevent recursion when checking membership
  -- VOLATILE is required because SET LOCAL is a side effect
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.partner_org_id = p_partner_org_id
      AND ur.partner_org_id IS NOT NULL
  );
END;
$$;


-- Check if current user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member (p_project_id UUID) returns BOOLEAN language plpgsql volatile security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS to prevent recursion when checking membership
  -- VOLATILE is required because SET LOCAL is a side effect
  SET LOCAL row_security = off;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.project_id = p_project_id
      AND ur.project_id IS NOT NULL
  );
END;
$$;


-- Grant execute permissions
GRANT
EXECUTE ON function public.is_base_member (UUID) TO authenticated;


GRANT
EXECUTE ON function public.is_partner_org_member (UUID) TO authenticated;


GRANT
EXECUTE ON function public.is_project_member (UUID) TO authenticated;


-- Add comments
comment ON function public.is_base_member (UUID) IS 'Checks if the current user is a member of a base. Uses SECURITY DEFINER and disables RLS to prevent recursion when called from RLS policies.';


comment ON function public.is_partner_org_member (UUID) IS 'Checks if the current user is a member of a partner org. Uses SECURITY DEFINER and disables RLS to prevent recursion when called from RLS policies.';


comment ON function public.is_project_member (UUID) IS 'Checks if the current user is a member of a project. Uses SECURITY DEFINER and disables RLS to prevent recursion when called from RLS policies.';


-- ============================================================================
-- UPDATE USER_ROLES RLS POLICIES TO USE HELPER FUNCTIONS
-- ============================================================================
-- Update base members policy
DROP POLICY if EXISTS user_roles_select_base_members ON public.user_roles;


CREATE POLICY user_roles_select_base_members ON public.user_roles FOR
SELECT
  USING (public.is_base_member (user_roles.base_id));


-- Update partner org members policy
DROP POLICY if EXISTS user_roles_select_partner_members ON public.user_roles;


CREATE POLICY user_roles_select_partner_members ON public.user_roles FOR
SELECT
  USING (
    public.is_partner_org_member (user_roles.partner_org_id)
  );


-- Update project members policy
DROP POLICY if EXISTS user_roles_select_project_members ON public.user_roles;


CREATE POLICY user_roles_select_project_members ON public.user_roles FOR
SELECT
  USING (public.is_project_member (user_roles.project_id));

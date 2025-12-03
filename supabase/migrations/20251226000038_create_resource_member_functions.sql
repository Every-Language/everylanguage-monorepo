-- Create resource member functions and recreate user_projects view
-- Migration: 20251226000038_create_resource_member_functions.sql
-- These functions bypass RLS to prevent recursion when querying members
-- ============================================================================
-- ============================================================================
-- RECREATE USER_PROJECTS VIEW
-- ============================================================================
-- Returns all projects where the authenticated user has a role, including role information
CREATE OR REPLACE VIEW user_projects
WITH
  (security_invoker = FALSE) AS
SELECT
  p.*,
  ur.role_id,
  r.role_key,
  r.name AS role_name,
  r.resource_type AS role_resource_type
FROM
  public.projects p
  INNER JOIN public.user_roles ur ON ur.project_id = p.id
  INNER JOIN public.roles r ON ur.role_id = r.id
WHERE
  ur.user_id = auth.uid ()
  AND ur.project_id IS NOT NULL;


comment ON view user_projects IS 'Returns all projects where the authenticated user has a role, including role information. Filtered by auth.uid() for security.';


-- ============================================================================
-- GRANT PERMISSIONS FOR USER_PROJECTS
-- ============================================================================
GRANT
SELECT
  ON user_projects TO authenticated;


-- ============================================================================
-- FIX GET_PARTNER_ORG_MEMBERS FUNCTION
-- ============================================================================
-- Fix the function to compute full_name from first_name and last_name
CREATE OR REPLACE FUNCTION public.get_partner_org_members (p_partner_org_id UUID) returns TABLE (
  user_id UUID,
  role_id UUID,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_full_name TEXT,
  role_name TEXT,
  role_key TEXT,
  role_resource_type TEXT
) language plpgsql security definer -- This bypasses RLS to prevent recursion
SET
  search_path = public,
  pg_temp -- Security best practice
  AS $$
BEGIN
  -- Security check: Only allow users who have permission to view partner org members
  -- This checks if the user has partner.manage_roles permission or is the creator
  IF NOT (
    -- Check if user is the creator of the partner org
    EXISTS (
      SELECT 1
      FROM public.partner_orgs po
      WHERE po.id = p_partner_org_id
        AND po.created_by = auth.uid()
    )
    OR
    -- Check if user has partner.manage_roles permission
    public.has_permission(
      auth.uid(),
      'partner.manage_roles'::permission_key,
      'partner'::resource_type,
      p_partner_org_id
    )
    OR
    -- Check if user has partner.read permission (for viewing members)
    public.has_permission(
      auth.uid(),
      'partner.read'::permission_key,
      'partner'::resource_type,
      p_partner_org_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view members of this partner organization';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id,
    ur.role_id,
    u.first_name::TEXT,
    u.last_name::TEXT,
    u.email::TEXT,
    -- Compute full_name from first_name and last_name
    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::TEXT AS user_full_name,
    r.name::TEXT as role_name,
    r.role_key::TEXT,
    r.resource_type::TEXT as role_resource_type
  FROM public.user_roles ur
  INNER JOIN public.users u ON u.id = ur.user_id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.partner_org_id = p_partner_org_id;
END;
$$;


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.get_partner_org_members (UUID) TO authenticated;


comment ON function public.get_partner_org_members IS 'Safely retrieves partner org members with their roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users must have partner.read or partner.manage_roles permission for the partner org. Computes full_name from first_name and last_name.';


-- ============================================================================
-- CREATE GET_PROJECT_MEMBERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_project_members (p_project_id UUID) returns TABLE (
  user_id UUID,
  role_id UUID,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_full_name TEXT,
  role_name TEXT,
  role_key TEXT,
  role_resource_type TEXT
) language plpgsql security definer -- This bypasses RLS to prevent recursion
SET
  search_path = public,
  pg_temp -- Security best practice
  AS $$
BEGIN
  -- Security check: Only allow users who have permission to view project members
  -- This checks if the user has project.manage_roles permission or is the creator
  IF NOT (
    -- Check if user is the creator of the project
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = p_project_id
        AND p.created_by = auth.uid()
    )
    OR
    -- Check if user has project.manage_roles permission
    public.has_permission(
      auth.uid(),
      'project.manage_roles'::permission_key,
      'project'::resource_type,
      p_project_id
    )
    OR
    -- Check if user has project.read permission (for viewing members)
    public.has_permission(
      auth.uid(),
      'project.read'::permission_key,
      'project'::resource_type,
      p_project_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view members of this project';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id,
    ur.role_id,
    u.first_name::TEXT,
    u.last_name::TEXT,
    u.email::TEXT,
    -- Compute full_name from first_name and last_name
    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::TEXT AS user_full_name,
    r.name::TEXT as role_name,
    r.role_key::TEXT,
    r.resource_type::TEXT as role_resource_type
  FROM public.user_roles ur
  INNER JOIN public.users u ON u.id = ur.user_id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.project_id = p_project_id;
END;
$$;


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.get_project_members (UUID) TO authenticated;


comment ON function public.get_project_members IS 'Safely retrieves project members with their roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users must have project.read or project.manage_roles permission for the project. Computes full_name from first_name and last_name.';


-- ============================================================================
-- CREATE GET_BASE_MEMBERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_base_members (p_base_id UUID) returns TABLE (
  user_id UUID,
  role_id UUID,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_full_name TEXT,
  role_name TEXT,
  role_key TEXT,
  role_resource_type TEXT
) language plpgsql security definer -- This bypasses RLS to prevent recursion
SET
  search_path = public,
  pg_temp -- Security best practice
  AS $$
BEGIN
  -- Security check: Only allow users who have permission to view base members
  -- This checks if the user has base.manage_roles permission or is the creator
  IF NOT (
    -- Check if user is the creator of the base
    EXISTS (
      SELECT 1
      FROM public.bases b
      WHERE b.id = p_base_id
        AND b.created_by = auth.uid()
    )
    OR
    -- Check if user has base.manage_roles permission
    public.has_permission(
      auth.uid(),
      'base.manage_roles'::permission_key,
      'base'::resource_type,
      p_base_id
    )
    OR
    -- Check if user has base.read permission (for viewing members)
    public.has_permission(
      auth.uid(),
      'base.read'::permission_key,
      'base'::resource_type,
      p_base_id
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: You do not have permission to view members of this base';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id,
    ur.role_id,
    u.first_name::TEXT,
    u.last_name::TEXT,
    u.email::TEXT,
    -- Compute full_name from first_name and last_name
    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))::TEXT AS user_full_name,
    r.name::TEXT as role_name,
    r.role_key::TEXT,
    r.resource_type::TEXT as role_resource_type
  FROM public.user_roles ur
  INNER JOIN public.users u ON u.id = ur.user_id
  LEFT JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.base_id = p_base_id;
END;
$$;


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.get_base_members (UUID) TO authenticated;


comment ON function public.get_base_members IS 'Safely retrieves base members with their roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users must have base.read or base.manage_roles permission for the base. Computes full_name from first_name and last_name.';

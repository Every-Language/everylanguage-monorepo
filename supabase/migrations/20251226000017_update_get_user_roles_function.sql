-- Update get_user_roles function to use new column structure
-- Migration: 20251226000017_update_get_user_roles_function.sql
-- This migration updates the get_user_roles() function to return new columns instead of context_type/context_id
-- Drop the old function first (PostgreSQL doesn't allow changing return type with CREATE OR REPLACE)
DROP FUNCTION if EXISTS public.get_user_roles (UUID);


CREATE FUNCTION public.get_user_roles (target_user_id UUID) returns TABLE (
  role_key TEXT,
  role_name TEXT,
  resource_type TEXT,
  project_id UUID,
  base_id UUID,
  partner_org_id UUID,
  is_global BOOLEAN
) language plpgsql security definer -- This bypasses RLS to prevent recursion
SET
  search_path = public stable AS $$
BEGIN
  -- Only allow users to fetch their own roles (security check)
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Access denied: Users can only fetch their own roles';
  END IF;

  RETURN QUERY
  SELECT 
    r.role_key,
    r.name as role_name,
    r.resource_type::text,
    ur.project_id,
    ur.base_id,
    ur.partner_org_id,
    ur.is_global
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = target_user_id;
END;
$$;


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.get_user_roles (UUID) TO authenticated;


-- Add comment for documentation
comment ON function public.get_user_roles IS 'Safely retrieves user roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users can only fetch their own roles. Returns project_id, base_id, partner_org_id, and is_global instead of context_type/context_id.';

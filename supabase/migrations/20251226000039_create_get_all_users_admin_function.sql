-- Create admin function to list all users with their user_roles
-- Migration: 20251226000039_create_get_all_users_admin_function.sql
-- This function bypasses RLS to prevent recursion and provides efficient user listing for admin dashboard
-- Returns users with nested user_roles (which contain entity IDs), allowing frontend to batch query entities separately
-- ============================================================================
-- ============================================================================
-- GET_ALL_USERS FUNCTION
-- ============================================================================
-- Returns paginated list of all users with their user_roles nested
-- Only accessible to system admins
-- Optimized for performance with large user counts
-- Frontend should batch query bases/projects/partner_orgs separately using the IDs from user_roles
CREATE OR REPLACE FUNCTION public.get_all_users (
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_search_query TEXT DEFAULT NULL
) returns TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_anonymous BOOLEAN,
  user_roles JSONB,
  total_count BIGINT
) language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  -- Security check: Only system admins can call this function
  IF NOT public.has_permission(
    auth.uid(),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL::UUID
  ) THEN
    RAISE EXCEPTION 'Access denied: System admin permission required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  -- Get total count (for pagination) - only count users matching search
  SELECT COUNT(*) INTO v_total_count
  FROM public.users u
  WHERE (p_search_query IS NULL OR p_search_query = '' OR
         u.first_name ILIKE '%' || p_search_query || '%' OR
         u.last_name ILIKE '%' || p_search_query || '%' OR
         u.email ILIKE '%' || p_search_query || '%');

  -- Return paginated users with nested user_roles as JSONB
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.first_name::TEXT,
    u.last_name::TEXT,
    u.email::TEXT,
    u.phone_number::TEXT,
    u.created_at,
    u.updated_at,
    u.is_anonymous,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ur.id,
          'user_id', ur.user_id,
          'role_id', ur.role_id,
          'base_id', ur.base_id,
          'project_id', ur.project_id,
          'partner_org_id', ur.partner_org_id,
          'is_global', ur.is_global,
          'created_at', ur.created_at,
          'updated_at', ur.updated_at,
          'role', jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'role_key', r.role_key,
            'resource_type', r.resource_type
          )
        )
      )
      FROM public.user_roles ur
      LEFT JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id
    ), '[]'::jsonb) AS user_roles,
    v_total_count AS total_count
  FROM public.users u
  WHERE (p_search_query IS NULL OR p_search_query = '' OR
         u.first_name ILIKE '%' || p_search_query || '%' OR
         u.last_name ILIKE '%' || p_search_query || '%' OR
         u.email ILIKE '%' || p_search_query || '%')
  ORDER BY u.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;


-- Grant execute permission to authenticated users (function will check admin permission internally)
GRANT
EXECUTE ON function public.get_all_users (INTEGER, INTEGER, TEXT) TO authenticated;


comment ON function public.get_all_users IS 'Returns paginated list of all users with nested user_roles (containing entity IDs). Only accessible to system admins. Frontend should batch query bases/projects/partner_orgs separately using IDs from user_roles for optimal performance.';

-- Update get_partner_org_members function to use new column structure
-- Migration: 20251226000018_update_get_partner_org_members_function.sql
-- This migration updates the get_partner_org_members() function WHERE clause to use partner_org_id instead of context_type/context_id
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
    u.full_name::TEXT,
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


-- Add comment for documentation
comment ON function public.get_partner_org_members IS 'Safely retrieves partner org members with their roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users must have partner.read or partner.manage_roles permission for the partner org. Uses partner_org_id column instead of context_type/context_id.';

-- Create a function to get user roles that bypasses RLS
-- This prevents the "stack depth limit exceeded" error caused by recursive RLS policies
-- when frontend tries to query user_roles table
CREATE OR REPLACE FUNCTION public.get_user_roles (target_user_id UUID) returns TABLE (
  role_key TEXT,
  role_name TEXT,
  resource_type TEXT,
  context_type TEXT,
  context_id UUID
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
    ur.context_type,
    ur.context_id
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = target_user_id;
END;
$$;


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.get_user_roles (UUID) TO authenticated;


-- Add comment for documentation
comment ON function public.get_user_roles IS 'Safely retrieves user roles without triggering RLS recursion. Uses SECURITY DEFINER to bypass RLS policies. Users can only fetch their own roles.';

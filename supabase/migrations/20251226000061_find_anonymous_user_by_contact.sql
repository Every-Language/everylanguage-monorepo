-- Create RPC function to find anonymous or authenticated users by email or phone
-- This prevents data fragmentation from multiple anonymous users with the same contact info
-- Uses SECURITY DEFINER to access auth.users table
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_anonymous_user_by_contact (
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) returns TABLE (
  user_id UUID,
  is_anonymous BOOLEAN,
  email TEXT,
  phone TEXT
) language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_normalized_phone TEXT;
BEGIN
  -- Validate that at least one parameter is provided
  IF p_email IS NULL AND p_phone IS NULL THEN
    RAISE EXCEPTION 'At least one of email or phone must be provided';
  END IF;

  -- Normalize phone number if provided (basic normalization - remove spaces, dashes, parentheses)
  -- Note: Full E.164 normalization should be done in application layer
  -- This function does basic cleanup for comparison
  IF p_phone IS NOT NULL THEN
    v_normalized_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
  END IF;

  -- Query auth.users table for matching email or phone
  -- Check both anonymous and authenticated users
  RETURN QUERY
  SELECT 
    au.id::UUID as user_id,
    COALESCE(au.is_anonymous, false)::BOOLEAN as is_anonymous,
    au.email::TEXT,
    au.phone::TEXT
  FROM auth.users au
  WHERE 
    -- Match by email (case-insensitive)
    (p_email IS NOT NULL AND LOWER(au.email) = LOWER(p_email))
    OR
    -- Match by phone (basic normalization)
    (p_phone IS NOT NULL AND v_normalized_phone IS NOT NULL 
     AND regexp_replace(COALESCE(au.phone, ''), '[^0-9+]', '', 'g') = v_normalized_phone)
  ORDER BY 
    -- Prefer authenticated users over anonymous users
    CASE WHEN COALESCE(au.is_anonymous, false) THEN 1 ELSE 0 END,
    -- Prefer users with matching email over phone-only matches
    CASE WHEN p_email IS NOT NULL AND LOWER(au.email) = LOWER(p_email) THEN 0 ELSE 1 END
  LIMIT 1;
END;
$$;


-- Grant execute permission to authenticated and anon users
-- This allows the frontend to call this function before creating anonymous users
GRANT
EXECUTE ON function public.find_anonymous_user_by_contact (TEXT, TEXT) TO authenticated,
anon;


-- Add comment for documentation
comment ON function public.find_anonymous_user_by_contact IS 'Finds existing anonymous or authenticated users by email or phone to prevent data fragmentation. Returns user_id and is_anonymous flag. Uses SECURITY DEFINER to access auth.users table. Called from frontend before creating new anonymous users.';

-- Assign System Admin Role to a User
-- 
-- Usage:
-- 1. Create the user using the create-user Edge Function (with optional password) 
--    or Supabase Dashboard → Authentication → Users → Add user
-- 2. Set password via:
--    - Supabase Dashboard → Authentication → Users → [User] → Reset Password
--    - OR use admin-reset-user-password Edge Function
--    - OR include password when creating user via create-user Edge Function
-- 3. Replace 'user@example.com' below with the actual email address
-- 4. Run this SQL in the Supabase Dashboard SQL Editor
--
-- This script will:
-- - Find the user by email
-- - Find the system_admin role
-- - Assign the role with is_global = true
-- ============================================================================

INSERT INTO
  user_roles (user_id, role_id, is_global)
SELECT
  u.id AS user_id,
  r.id AS role_id,
  TRUE AS is_global
FROM
  public.users u
  CROSS JOIN roles r
WHERE
  u.email = 'user@example.com' -- ⚠️ REPLACE THIS WITH THE ACTUAL EMAIL
  AND r.role_key = 'system_admin'
  AND r.resource_type = 'global'
ON CONFLICT (user_id, role_id) 
WHERE is_global = TRUE 
DO NOTHING;

-- Verify the assignment
SELECT
  u.email,
  u.first_name,
  u.last_name,
  r.name AS role_name,
  r.role_key,
  ur.is_global,
  ur.created_at AS role_assigned_at
FROM
  public.users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
WHERE
  u.email = 'user@example.com' -- ⚠️ REPLACE THIS WITH THE ACTUAL EMAIL
  AND r.role_key = 'system_admin';

-- Quick Script: Create ONLY System Admin User
-- Use this if you just want to create a system admin without all the other test data
--
-- This script:
-- 1. Creates auth user: systemadmin@everylanguage.com
-- 2. Creates public user record
-- 3. Assigns system_admin role (global context)
--
-- Password: systemadmin@everylanguage.com (same as email)
-- ============================================================================
-- CREATE AUTH USER
-- ============================================================================
INSERT INTO
  auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440017',
    'authenticated',
    'authenticated',
    'systemadmin@everylanguage.com',
    crypt ('systemadmin@everylanguage.com', gen_salt ('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- CREATE PUBLIC USER RECORD
-- ============================================================================
INSERT INTO
  public.users (id, email, is_anonymous)
SELECT
  id,
  email,
  FALSE
FROM
  auth.users
WHERE
  id = '880e8400-e29b-41d4-a716-446655440017'
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- ASSIGN SYSTEM ADMIN ROLE
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
SELECT
  '880e8400-e29b-41d4-a716-446655440017'::UUID,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = 'system_admin'
  ),
  'global',
  NULL
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify the system admin was created successfully
SELECT
  'System Admin Created Successfully!' AS message,
  au.email,
  r.name AS role_name,
  r.role_key,
  ur.context_type,
  '✅ You can now login with:' AS login_info,
  'Email: systemadmin@everylanguage.com' AS email_credential,
  'Password: systemadmin@everylanguage.com' AS password_credential
FROM
  auth.users au
  JOIN public.users u ON u.id = au.id
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
WHERE
  au.email = 'systemadmin@everylanguage.com'
  AND r.role_key = 'system_admin';

-- Verification Queries for Test User Seeding
-- Run this after seeding to verify everything worked correctly
-- ============================================================================
-- 1. VERIFY SYSTEM ADMIN EXISTS
-- ============================================================================
SELECT
  '1. System Admin Verification' AS check_name,
  au.email,
  r.name AS role_name,
  r.role_key,
  ur.context_type,
  CASE
    WHEN au.email IS NOT NULL THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM
  auth.users au
  JOIN public.users u ON u.id = au.id
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON r.id = ur.role_id
WHERE
  au.email = 'systemadmin@everylanguage.com'
  AND r.role_key = 'system_admin';


-- ============================================================================
-- 2. COUNT ALL RBAC TEST USERS
-- ============================================================================
SELECT
  '2. RBAC Test Users Count' AS check_name,
  COUNT(*) AS user_count,
  CASE
    WHEN COUNT(*) = 9 THEN '✅ PASS (all 9 users created)'
    ELSE '❌ FAIL (expected 9 users)'
  END AS status
FROM
  auth.users
WHERE
  email LIKE '%@everylanguage.com';


-- ============================================================================
-- 3. LIST ALL RBAC TEST USERS WITH THEIR PRIMARY ROLES
-- ============================================================================
SELECT
  '3. All RBAC Test Users' AS check_name,
  au.email,
  r.name AS role_name,
  ur.context_type,
  CASE ur.context_type
    WHEN 'global' THEN 'Global'
    WHEN 'partner' THEN po.name
    WHEN 'project' THEN p.name
    WHEN 'team' THEN t.name
    WHEN 'base' THEN b.name
  END AS context_name
FROM
  auth.users au
  JOIN public.users u ON u.id = au.id
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  LEFT JOIN partner_orgs po ON ur.context_id = po.id
  AND ur.context_type = 'partner'
  LEFT JOIN projects p ON ur.context_id = p.id
  AND ur.context_type = 'project'
  LEFT JOIN teams t ON ur.context_id = t.id
  AND ur.context_type = 'team'
  LEFT JOIN bases b ON ur.context_id = b.id
  AND ur.context_type = 'base'
WHERE
  au.email LIKE '%@everylanguage.com'
ORDER BY
  au.email,
  ur.context_type;


-- ============================================================================
-- 4. VERIFY ROLE ASSIGNMENTS SUMMARY
-- ============================================================================
SELECT
  '4. Role Assignment Summary' AS check_name,
  ur.context_type,
  r.role_key,
  COUNT(*) AS assignment_count
FROM
  user_roles ur
  JOIN roles r ON r.id = ur.role_id
  JOIN auth.users au ON au.id = ur.user_id
WHERE
  au.email LIKE '%@everylanguage.com'
GROUP BY
  ur.context_type,
  r.role_key
ORDER BY
  ur.context_type,
  r.role_key;


-- ============================================================================
-- 5. VERIFY TEST ENTITIES EXIST
-- ============================================================================
SELECT
  '5. Test Entities Check' AS check_name,
  'Test Base' AS entity_type,
  name,
  id,
  '✅ EXISTS' AS status
FROM
  bases
WHERE
  name = 'Test Base'
UNION ALL
SELECT
  '5. Test Entities Check' AS check_name,
  'Test Team' AS entity_type,
  name,
  id::TEXT,
  '✅ EXISTS' AS status
FROM
  teams
WHERE
  name = 'Test Team'
UNION ALL
SELECT
  '5. Test Entities Check' AS check_name,
  'Test Project' AS entity_type,
  name,
  id::TEXT,
  '✅ EXISTS' AS status
FROM
  projects
WHERE
  name = 'Test Project'
UNION ALL
SELECT
  '5. Test Entities Check' AS check_name,
  'Test Partner Org' AS entity_type,
  name,
  id::TEXT,
  '✅ EXISTS' AS status
FROM
  partner_orgs
WHERE
  name = 'Test Partner Org';


-- ============================================================================
-- 6. QUICK LOGIN TEST INFO
-- ============================================================================
SELECT
  '6. Login Test Info' AS check_name,
  'To test login, use these credentials:' AS info,
  STRING_AGG(
    email || ' (password: ' || email || ')',
    E'\n'
    ORDER BY
      email
  ) AS credentials
FROM
  auth.users
WHERE
  email LIKE '%@everylanguage.com';

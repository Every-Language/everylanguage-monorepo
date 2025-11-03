-- RBAC Test Users and Entities Seed Data
-- This file contains additional test data for RBAC testing
-- 
-- ⚠️  PREREQUISITES:
-- This file requires roles to be created first. Either:
-- 1. Run migrations + 01_seed_test_users.sql first (recommended via `supabase db reset`)
-- 2. If running manually in SQL editor, run 01_seed_test_users.sql first
-- 
-- The following role IDs must exist:
-- - '550e8400-e29b-41d4-a716-446655440101' (project_viewer)
-- - '550e8400-e29b-41d4-a716-446655440102' (project_editor)
-- - '550e8400-e29b-41d4-a716-446655440103' (project_admin)
-- - '550e8400-e29b-41d4-a716-446655440301' (team_member)
-- - '550e8400-e29b-41d4-a716-446655440302' (team_leader)
-- - '550e8400-e29b-41d4-a716-446655440401' (base_member)
-- - '550e8400-e29b-41d4-a716-446655440402' (base_staff)
-- - '550e8400-e29b-41d4-a716-446655440501' (partner_member)
-- - '550e8400-e29b-41d4-a716-446655440502' (partner_leader)
-- - '550e8400-e29b-41d4-a716-446655440503' (partner_admin)
-- - '550e8400-e29b-41d4-a716-446655440200' (system_admin)
-- 
-- ============================================================================
-- TEST BASE
-- ============================================================================
INSERT INTO
  bases (id, name, location)
VALUES
  (
    '660e8400-e29b-41d4-a716-446655440004',
    'Test Base',
    POINT(0.0, 0.0)
  ) -- Test Base
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- TEST TEAM
-- ============================================================================
INSERT INTO
  teams (id, name, type)
VALUES
  (
    '770e8400-e29b-41d4-a716-446655440005',
    'Test Team',
    'translation'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- TEST BASES-TEAMS RELATIONSHIP
-- ============================================================================
INSERT INTO
  bases_teams (team_id, base_id, role_id)
VALUES
  -- Test Team -> Test Base with staff role
  (
    '770e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440402'
  )
ON CONFLICT (team_id, base_id, role_id) DO NOTHING;


-- ============================================================================
-- TEST PROJECT
-- ============================================================================
INSERT INTO
  public.projects (
    id,
    name,
    description,
    source_language_entity_id,
    target_language_entity_id,
    created_by
  )
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    'Test Project',
    'Test project for RBAC testing',
    '990e8400-e29b-41d4-a716-446655440001',
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440009'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- TEST PROJECTS_TEAMS RELATIONSHIP
-- ============================================================================
INSERT INTO
  public.projects_teams (project_id, team_id, project_role_id, is_primary)
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    '770e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440102',
    TRUE
  )
ON CONFLICT (project_id, team_id)
WHERE
  (unassigned_at IS NULL) DO NOTHING;


-- ============================================================================
-- TEST PARTNER ORG
-- ============================================================================
INSERT INTO
  public.partner_orgs (id, name, description, created_by)
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440002',
    'Test Partner Org',
    'Test partner org for RBAC testing',
    '880e8400-e29b-41d4-a716-446655440014'
  )
ON CONFLICT (id) DO NOTHING;


INSERT INTO
  public.partner_orgs_projects (project_id, partner_org_id)
VALUES
  (
    'aa0e8400-e29b-41d4-a716-446655440002',
    'bb0e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (project_id, partner_org_id)
WHERE
  (unassigned_at IS NULL) DO NOTHING;


-- ============================================================================
-- TEST AUTH USERS (for testing login)
-- ============================================================================
-- Note: Passwords are identical to email addresses for testing
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
    '880e8400-e29b-41d4-a716-446655440009',
    'authenticated',
    'authenticated',
    'teamleader@everylanguage.com',
    crypt ('teamleader@everylanguage.com', gen_salt ('bf')),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440010',
    'authenticated',
    'authenticated',
    'teammember@everylanguage.com',
    crypt ('teammember@everylanguage.com', gen_salt ('bf')),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440011',
    'authenticated',
    'authenticated',
    'projectadmin@everylanguage.com',
    crypt ('projectadmin@everylanguage.com', gen_salt ('bf')),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440012',
    'authenticated',
    'authenticated',
    'projectviewer@everylanguage.com',
    crypt (
      'projectviewer@everylanguage.com',
      gen_salt ('bf')
    ),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440013',
    'authenticated',
    'authenticated',
    'projecteditor@everylanguage.com',
    crypt (
      'projecteditor@everylanguage.com',
      gen_salt ('bf')
    ),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440014',
    'authenticated',
    'authenticated',
    'partneradmin@everylanguage.com',
    crypt ('partneradmin@everylanguage.com', gen_salt ('bf')),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440015',
    'authenticated',
    'authenticated',
    'partnerleader@everylanguage.com',
    crypt (
      'partnerleader@everylanguage.com',
      gen_salt ('bf')
    ),
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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '880e8400-e29b-41d4-a716-446655440016',
    'authenticated',
    'authenticated',
    'partnermember@everylanguage.com',
    crypt (
      'partnermember@everylanguage.com',
      gen_salt ('bf')
    ),
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
  ),
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
-- TEST PUBLIC USERS (explicit insert to ensure FK for created_by)
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
  id IN (
    '880e8400-e29b-41d4-a716-446655440009',
    '880e8400-e29b-41d4-a716-446655440010',
    '880e8400-e29b-41d4-a716-446655440011',
    '880e8400-e29b-41d4-a716-446655440012',
    '880e8400-e29b-41d4-a716-446655440013',
    '880e8400-e29b-41d4-a716-446655440014',
    '880e8400-e29b-41d4-a716-446655440015',
    '880e8400-e29b-41d4-a716-446655440016',
    '880e8400-e29b-41d4-a716-446655440017'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- USER ROLES - TEAM ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- teamleader@everylanguage.com - Team Leader in Test Team
  (
    '880e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440302',
    'team',
    '770e8400-e29b-41d4-a716-446655440005'
  ),
  -- teammember@everylanguage.com - Team Member in Test Team
  (
    '880e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440301',
    'team',
    '770e8400-e29b-41d4-a716-446655440005'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - BASE ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- All new test users get base member role at Test Base
  (
    '880e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440016',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  ),
  (
    '880e8400-e29b-41d4-a716-446655440017',
    '550e8400-e29b-41d4-a716-446655440401',
    'base',
    '660e8400-e29b-41d4-a716-446655440004'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - PARTNER ORG ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- partneradmin@everylanguage.com - Partner Admin in Test Partner Org
  (
    '880e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440503',
    'partner',
    'bb0e8400-e29b-41d4-a716-446655440002'
  ),
  -- partnerleader@everylanguage.com - Partner Leader in Test Partner Org
  (
    '880e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440502',
    'partner',
    'bb0e8400-e29b-41d4-a716-446655440002'
  ),
  -- partnermember@everylanguage.com - Partner Member in Test Partner Org
  (
    '880e8400-e29b-41d4-a716-446655440016',
    '550e8400-e29b-41d4-a716-446655440501',
    'partner',
    'bb0e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - PROJECT DIRECT ASSIGNMENTS (not team-based)
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- projectadmin@everylanguage.com - Project Admin in Test Project
  (
    '880e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440103',
    'project',
    'aa0e8400-e29b-41d4-a716-446655440002'
  ),
  -- projectviewer@everylanguage.com - Project Viewer in Test Project
  (
    '880e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440101',
    'project',
    'aa0e8400-e29b-41d4-a716-446655440002'
  ),
  -- projecteditor@everylanguage.com - Project Editor in Test Project
  (
    '880e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440102',
    'project',
    'aa0e8400-e29b-41d4-a716-446655440002'
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - GLOBAL/SYSTEM ADMIN ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
VALUES
  -- systemadmin@everylanguage.com - System Admin (global role)
  (
    '880e8400-e29b-41d4-a716-446655440017',
    '550e8400-e29b-41d4-a716-446655440200',
    'global',
    NULL
  )
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- SET created_by FOR TEST ENTITIES
-- ============================================================================
-- Test Team
UPDATE public.teams
SET
  created_by = '880e8400-e29b-41d4-a716-446655440009' -- teamleader@everylanguage.com
WHERE
  id = '770e8400-e29b-41d4-a716-446655440005';


-- Test Base
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440009' -- teamleader@everylanguage.com
WHERE
  id = '660e8400-e29b-41d4-a716-446655440004';

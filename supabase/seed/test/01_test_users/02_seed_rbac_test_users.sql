-- RBAC Test Users and Entities Seed Data
-- This file contains additional test data for RBAC testing
-- 
-- ⚠️  PREREQUISITES:
-- This file requires roles to exist in the database (created by migrations).
-- Run this AFTER 01_seed_test_users.sql or after migrations have been applied.
-- 
-- This file will query the database for role IDs based on role_key rather than
-- using hardcoded UUIDs, making it compatible with any database that has the
-- standard roles created.
-- 
-- Required roles (by role_key):
-- - project_viewer, project_editor, project_admin
-- - team_member, team_leader
-- - base_member, base_staff  
-- - partner_member, partner_leader, partner_admin
-- - system_admin
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
SELECT
  '770e8400-e29b-41d4-a716-446655440005'::UUID,
  '660e8400-e29b-41d4-a716-446655440004'::UUID,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = 'base_staff'
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
SELECT
  'aa0e8400-e29b-41d4-a716-446655440002'::UUID,
  '770e8400-e29b-41d4-a716-446655440005'::UUID,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = 'project_editor'
  ),
  TRUE
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


-- NOTE: partner_orgs_projects table dropped - relationships now managed via sponsorships/sponsorship_allocations
-- If test data needs partner org <-> project linkage, add via sponsorship_allocations instead
-- INSERT INTO
--   public.partner_orgs_projects (project_id, partner_org_id)
-- VALUES
--   (
--     'aa0e8400-e29b-41d4-a716-446655440002',
--     'bb0e8400-e29b-41d4-a716-446655440002'
--   )
-- ON CONFLICT (project_id, partner_org_id)
-- WHERE (unassigned_at IS NULL) DO NOTHING;
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
SELECT
  user_id,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = role_key_to_use
  ),
  'team',
  context_id
FROM
  (
    VALUES
      -- teamleader@everylanguage.com - Team Leader in Test Team
      (
        '880e8400-e29b-41d4-a716-446655440009'::UUID,
        'team_leader',
        '770e8400-e29b-41d4-a716-446655440005'::UUID
      ),
      -- teammember@everylanguage.com - Team Member in Test Team
      (
        '880e8400-e29b-41d4-a716-446655440010'::UUID,
        'team_member',
        '770e8400-e29b-41d4-a716-446655440005'::UUID
      )
  ) AS t (user_id, role_key_to_use, context_id)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - BASE ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
SELECT
  user_id,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = 'base_member'
  ),
  'base',
  '660e8400-e29b-41d4-a716-446655440004'::UUID
FROM
  (
    VALUES
      -- All new test users get base member role at Test Base
      ('880e8400-e29b-41d4-a716-446655440009'::UUID),
      ('880e8400-e29b-41d4-a716-446655440010'::UUID),
      ('880e8400-e29b-41d4-a716-446655440011'::UUID),
      ('880e8400-e29b-41d4-a716-446655440012'::UUID),
      ('880e8400-e29b-41d4-a716-446655440013'::UUID),
      ('880e8400-e29b-41d4-a716-446655440014'::UUID),
      ('880e8400-e29b-41d4-a716-446655440015'::UUID),
      ('880e8400-e29b-41d4-a716-446655440016'::UUID),
      ('880e8400-e29b-41d4-a716-446655440017'::UUID)
  ) AS t (user_id)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - PARTNER ORG ASSIGNMENTS
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
SELECT
  user_id,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = role_key_to_use
  ),
  'partner',
  context_id
FROM
  (
    VALUES
      -- partneradmin@everylanguage.com - Partner Admin in Test Partner Org
      (
        '880e8400-e29b-41d4-a716-446655440014'::UUID,
        'partner_admin',
        'bb0e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- partnerleader@everylanguage.com - Partner Leader in Test Partner Org
      (
        '880e8400-e29b-41d4-a716-446655440015'::UUID,
        'partner_leader',
        'bb0e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- partnermember@everylanguage.com - Partner Member in Test Partner Org
      (
        '880e8400-e29b-41d4-a716-446655440016'::UUID,
        'partner_member',
        'bb0e8400-e29b-41d4-a716-446655440002'::UUID
      )
  ) AS t (user_id, role_key_to_use, context_id)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - PROJECT DIRECT ASSIGNMENTS (not team-based)
-- ============================================================================
INSERT INTO
  user_roles (user_id, role_id, context_type, context_id)
SELECT
  user_id,
  (
    SELECT
      id
    FROM
      roles
    WHERE
      role_key = role_key_to_use
  ),
  'project',
  context_id
FROM
  (
    VALUES
      -- projectadmin@everylanguage.com - Project Admin in Test Project
      (
        '880e8400-e29b-41d4-a716-446655440011'::UUID,
        'project_admin',
        'aa0e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- projectviewer@everylanguage.com - Project Viewer in Test Project
      (
        '880e8400-e29b-41d4-a716-446655440012'::UUID,
        'project_viewer',
        'aa0e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- projecteditor@everylanguage.com - Project Editor in Test Project
      (
        '880e8400-e29b-41d4-a716-446655440013'::UUID,
        'project_editor',
        'aa0e8400-e29b-41d4-a716-446655440002'::UUID
      )
  ) AS t (user_id, role_key_to_use, context_id)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- ============================================================================
-- USER ROLES - GLOBAL/SYSTEM ADMIN ASSIGNMENTS
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

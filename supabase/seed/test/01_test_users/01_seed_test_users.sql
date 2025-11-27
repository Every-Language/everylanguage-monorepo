-- Development Seed Data
-- This file contains seed data for local development
-- Run with: supabase db reset (this will run migrations + seed)
-- Or: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed/dev_seed.sql
-- ============================================================================
-- ROLES - Use existing roles from migrations
-- ============================================================================
-- Note: Roles are created by migrations. This section just documents the expected role IDs.
-- We query the database to get the actual role IDs rather than trying to insert them.
-- 
-- Expected roles (created by migrations):
-- - Base: Base Member, Base Staff, Base Admin  
-- - Partner: Partner Member, Partner Leader, Partner Admin
-- - Project: Project Viewer, Project Editor, Project Admin, Project Checker
-- - Global: System Admin
-- ============================================================================
-- BASES
-- ============================================================================
INSERT INTO
  bases (id, name, location)
VALUES
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'Kona',
    POINT(-155.9969, 19.6389)
  ), -- Kona, Hawaii
  (
    '660e8400-e29b-41d4-a716-446655440002',
    'Port Harcourt',
    POINT(7.0134, 4.8156)
  ), -- Port Harcourt, Nigeria
  (
    '660e8400-e29b-41d4-a716-446655440003',
    'Pokhara OMT Lighthouse',
    POINT(83.9856, 28.2096)
  ) -- Pokhara, Nepal
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- PUBLIC USERS (explicit insert to ensure FK for created_by)
-- =========================================================================
-- public.users rows will be created by trigger from auth.users; ensure they exist
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
    '880e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440003',
    '880e8400-e29b-41d4-a716-446655440004',
    '880e8400-e29b-41d4-a716-446655440005',
    '880e8400-e29b-41d4-a716-446655440006',
    '880e8400-e29b-41d4-a716-446655440007',
    '880e8400-e29b-41d4-a716-446655440008'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- AUTH USERS (for testing login)
-- ============================================================================
-- Note: These are created directly in auth.users for testing
-- In production, users would sign up through your frontend
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
    '880e8400-e29b-41d4-a716-446655440001',
    'authenticated',
    'authenticated',
    'sarah.johnson@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440002',
    'authenticated',
    'authenticated',
    'michael.chen@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440003',
    'authenticated',
    'authenticated',
    'priya.sharma@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440004',
    'authenticated',
    'authenticated',
    'david.wilson@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440005',
    'authenticated',
    'authenticated',
    'anne.okafor@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440006',
    'authenticated',
    'authenticated',
    'raj.patel@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440007',
    'authenticated',
    'authenticated',
    'lisa.martinez@example.com',
    crypt ('password123', gen_salt ('bf')),
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
    '880e8400-e29b-41d4-a716-446655440008',
    'authenticated',
    'authenticated',
    'john.doe@example.com',
    crypt ('password123', gen_salt ('bf')),
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


-- =========================================================================
-- LANGUAGE ENTITIES (minimal for project foreign keys)
-- =========================================================================
INSERT INTO
  public.language_entities (id, level, name)
VALUES
  (
    '990e8400-e29b-41d4-a716-446655440001',
    'language',
    'Lang A'
  ),
  (
    '990e8400-e29b-41d4-a716-446655440002',
    'language',
    'Lang B'
  )
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
-- PROJECTS
-- =========================================================================
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
    'aa0e8400-e29b-41d4-a716-446655440001',
    'Test Project Kona',
    'Seeded test project for RBAC checks',
    '990e8400-e29b-41d4-a716-446655440001',
    '990e8400-e29b-41d4-a716-446655440002',
    '880e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- BASES-PROJECTS RELATIONSHIPS (replaces bases-teams)
-- ============================================================================
INSERT INTO
  bases_projects (base_id, project_id)
VALUES
  -- Kona base -> Test Project Kona
  (
    '660e8400-e29b-41d4-a716-446655440001'::UUID,
    'aa0e8400-e29b-41d4-a716-446655440001'::UUID
  ),
  -- Pokhara base -> Test Project Kona
  (
    '660e8400-e29b-41d4-a716-446655440003'::UUID,
    'aa0e8400-e29b-41d4-a716-446655440001'::UUID
  )
ON CONFLICT (base_id, project_id)
WHERE unassigned_at IS NULL DO NOTHING;


-- =========================================================================
-- PARTNER ORGS AND ASSIGNMENT
-- =========================================================================
INSERT INTO
  public.partner_orgs (id, name, description, created_by)
VALUES
  (
    'bb0e8400-e29b-41d4-a716-446655440001',
    'Kona Community Church',
    'Seeded partner org for RBAC checks',
    '880e8400-e29b-41d4-a716-446655440001'
  )
ON CONFLICT (id) DO NOTHING;


-- NOTE: partner_orgs_projects table dropped - relationships now managed via sponsorships/sponsorship_allocations
-- If test data needs partner org <-> project linkage, add via sponsorship_allocations instead
-- INSERT INTO
--   public.partner_orgs_projects (project_id, partner_org_id)
-- VALUES
--   (
--     'aa0e8400-e29b-41d4-a716-446655440001',
--     'bb0e8400-e29b-41d4-a716-446655440001'
--   )
-- ON CONFLICT (project_id, partner_org_id)
-- WHERE (unassigned_at IS NULL) DO NOTHING;
-- ============================================================================
-- USER ROLES - PROJECT ASSIGNMENTS (direct project roles)
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
      -- Sarah Johnson - Admin on Test Project Kona
      (
        '880e8400-e29b-41d4-a716-446655440001'::UUID,
        'project_admin',
        'aa0e8400-e29b-41d4-a716-446655440001'::UUID
      ),
      -- Michael Chen - Editor on Test Project Kona
      (
        '880e8400-e29b-41d4-a716-446655440002'::UUID,
        'project_editor',
        'aa0e8400-e29b-41d4-a716-446655440001'::UUID
      ),
      -- Priya Sharma - Viewer on Test Project Kona
      (
        '880e8400-e29b-41d4-a716-446655440003'::UUID,
        'project_viewer',
        'aa0e8400-e29b-41d4-a716-446655440001'::UUID
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
      role_key = role_key_to_use
  ),
  'base',
  context_id
FROM
  (
    VALUES
      -- Sarah Johnson - Admin at Kona base
      (
        '880e8400-e29b-41d4-a716-446655440001'::UUID,
        'base_admin',
        '660e8400-e29b-41d4-a716-446655440001'::UUID
      ),
      -- Michael Chen - Staff at Pokhara base
      (
        '880e8400-e29b-41d4-a716-446655440002'::UUID,
        'base_staff',
        '660e8400-e29b-41d4-a716-446655440003'::UUID
      ),
      -- Priya Sharma - Member at Pokhara base
      (
        '880e8400-e29b-41d4-a716-446655440003'::UUID,
        'base_member',
        '660e8400-e29b-41d4-a716-446655440003'::UUID
      ),
      -- David Wilson - Admin at Port Harcourt base
      (
        '880e8400-e29b-41d4-a716-446655440004'::UUID,
        'base_admin',
        '660e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- Anne Okafor - Staff at Port Harcourt base
      (
        '880e8400-e29b-41d4-a716-446655440005'::UUID,
        'base_staff',
        '660e8400-e29b-41d4-a716-446655440002'::UUID
      ),
      -- Raj Patel - Member at Pokhara base
      (
        '880e8400-e29b-41d4-a716-446655440006'::UUID,
        'base_member',
        '660e8400-e29b-41d4-a716-446655440003'::UUID
      ),
      -- Lisa Martinez - Staff at Kona base (no team)
      (
        '880e8400-e29b-41d4-a716-446655440007'::UUID,
        'base_staff',
        '660e8400-e29b-41d4-a716-446655440001'::UUID
      ),
      -- John Doe - Member at Port Harcourt base (no team)
      (
        '880e8400-e29b-41d4-a716-446655440008'::UUID,
        'base_member',
        '660e8400-e29b-41d4-a716-446655440002'::UUID
      )
  ) AS t (user_id, role_key_to_use, context_id)
ON CONFLICT (user_id, role_id, context_type, context_id) DO NOTHING;


-- =========================================================================
-- SAMPLE PERMISSIONS (for demonstration)
-- =========================================================================
-- ROLE PERMISSIONS - These should already exist from migrations
-- Uncomment below if you need to add missing permissions
-- INSERT INTO
--   public.role_permissions (role_id, resource_type, permission_key, is_allowed)
-- SELECT
--   (SELECT id FROM roles WHERE role_key = role_key_to_use),
--   resource_type,
--   permission_key,
--   TRUE
-- FROM
--   (
--     VALUES
--       -- Project roles
--       ('project_viewer', 'project', 'project.read'),
--       ('project_editor', 'project', 'project.read'),
--       ('project_editor', 'project', 'project.write'),
--       ('project_admin', 'project', 'project.read'),
--       ('project_admin', 'project', 'project.write'),
--       ('project_admin', 'project', 'project.delete'),
--       ('project_admin', 'project', 'project.manage_roles'),
--       ('project_admin', 'project', 'project.invite'),
--       -- Team roles
--       ('team_member', 'team', 'team.read'),
--       ('team_leader', 'team', 'team.read'),
--       ('team_leader', 'team', 'team.write'),
--       ('team_admin', 'team', 'team.read'),
--       ('team_admin', 'team', 'team.write'),
--       ('team_admin', 'team', 'team.delete'),
--       ('team_admin', 'team', 'team.manage_roles'),
--       -- Base roles
--       ('base_member', 'base', 'base.read'),
--       ('base_staff', 'base', 'base.read'),
--       ('base_staff', 'base', 'base.write'),
--       ('base_admin', 'base', 'base.read'),
--       ('base_admin', 'base', 'base.write'),
--       ('base_admin', 'base', 'base.delete'),
--       ('base_admin', 'base', 'base.manage_roles'),
--       -- Partner roles
--       ('partner_member', 'partner', 'partner.read'),
--       ('partner_leader', 'partner', 'partner.read'),
--       ('partner_admin', 'partner', 'partner.read'),
--       ('partner_admin', 'partner', 'partner.manage_roles'),
--       -- Global role
--       ('system_admin', 'global', 'system.admin')
--   ) AS t(role_key_to_use, resource_type, permission_key)
-- ON CONFLICT (role_id, resource_type, permission_key) DO NOTHING;
-- =========================================================================
-- SET created_by for bases (ownership for testing)
-- =========================================================================
-- Bases
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440001' -- Sarah Johnson
WHERE
  id = '660e8400-e29b-41d4-a716-446655440001';


-- Kona
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440004' -- David Wilson
WHERE
  id = '660e8400-e29b-41d4-a716-446655440002';


-- Port Harcourt
UPDATE public.bases
SET
  created_by = '880e8400-e29b-41d4-a716-446655440002' -- Michael Chen
WHERE
  id = '660e8400-e29b-41d4-a716-446655440003';


-- Pokhara
-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the seed worked)
-- ============================================================================
/*
-- Check users and their auth connections
SELECT u.first_name, u.last_name, u.email, au.email as auth_email
FROM public.users u
JOIN auth.users au ON u.auth_uid = au.id;

-- Check user project assignments
SELECT 
u.first_name || ' ' || u.last_name as user_name,
r.name as role,
p.name as project,
'project' as context_type
FROM public.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN projects p ON ur.context_id = p.id
WHERE ur.context_type = 'project'
ORDER BY u.first_name;

-- Check user base assignments  
SELECT 
u.first_name || ' ' || u.last_name as user_name,
r.name as role,
b.name as base,
'base' as context_type
FROM public.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN bases b ON ur.context_id = b.id
WHERE ur.context_type = 'base'
ORDER BY u.first_name;

-- Check base-project relationships
SELECT 
b.name as base,
p.name as project
FROM bases b
JOIN bases_projects bp ON b.id = bp.base_id
JOIN projects p ON bp.project_id = p.id
WHERE bp.unassigned_at IS NULL
ORDER BY b.name, p.name;
*/

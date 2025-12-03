-- Update bases and partner_orgs INSERT policies to use has_permission
-- Add comprehensive users table RLS policies for domain members and admins
-- Migration: 20251226000023_update_bases_partner_orgs_users_rls.sql
-- ============================================================================
-- BASES TABLE - Update INSERT policy to use has_permission
-- ============================================================================
DROP POLICY if EXISTS bases_insert_with_permission ON public.bases;


CREATE POLICY bases_insert_with_permission ON public.bases FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- ============================================================================
-- PARTNER_ORGS TABLE - Update INSERT policy to use has_permission
-- ============================================================================
DROP POLICY if EXISTS partner_orgs_insert_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_insert_with_permission ON public.partner_orgs FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- ============================================================================
-- USERS TABLE - Add comprehensive RLS policies
-- ============================================================================
-- Policy 1: System admins can view all users
DROP POLICY if EXISTS users_select_system_admin ON public.users;


CREATE POLICY users_select_system_admin ON public.users FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- Policy 2: System admins can update all users
DROP POLICY if EXISTS users_update_system_admin ON public.users;


CREATE POLICY users_update_system_admin ON public.users
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- Policy 3: System admins can insert users (for admin user creation)
DROP POLICY if EXISTS users_insert_system_admin ON public.users;


CREATE POLICY users_insert_system_admin ON public.users FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- Policy 4: Base members can view all users in their base
-- Any user with ANY role in a base can view all users who also have a role in that same base
DROP POLICY if EXISTS users_select_base_members ON public.users;


CREATE POLICY users_select_base_members ON public.users FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles viewer_role
        JOIN public.user_roles target_role ON viewer_role.base_id = target_role.base_id
        AND viewer_role.base_id IS NOT NULL
        AND target_role.base_id IS NOT NULL
      WHERE
        viewer_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
    )
  );


-- Policy 5: Project members can view all users in their project
-- Any user with ANY role in a project can view all users who also have a role in that same project
DROP POLICY if EXISTS users_select_project_members ON public.users;


CREATE POLICY users_select_project_members ON public.users FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles viewer_role
        JOIN public.user_roles target_role ON viewer_role.project_id = target_role.project_id
        AND viewer_role.project_id IS NOT NULL
        AND target_role.project_id IS NOT NULL
      WHERE
        viewer_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
    )
  );


-- Policy 6: Base admins can update users in their base
-- Only users with base.manage_roles permission can update users in that base
DROP POLICY if EXISTS users_update_base_admin ON public.users;


CREATE POLICY users_update_base_admin ON public.users
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles admin_role
        JOIN public.user_roles target_role ON admin_role.base_id = target_role.base_id
        AND admin_role.base_id IS NOT NULL
        AND target_role.base_id IS NOT NULL
        JOIN public.role_permissions rp ON rp.role_id = admin_role.role_id
      WHERE
        admin_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
        AND rp.resource_type = 'base'::resource_type
        AND rp.permission_key = 'base.manage_roles'::permission_key
        AND rp.is_allowed = TRUE
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles admin_role
        JOIN public.user_roles target_role ON admin_role.base_id = target_role.base_id
        AND admin_role.base_id IS NOT NULL
        AND target_role.base_id IS NOT NULL
        JOIN public.role_permissions rp ON rp.role_id = admin_role.role_id
      WHERE
        admin_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
        AND rp.resource_type = 'base'::resource_type
        AND rp.permission_key = 'base.manage_roles'::permission_key
        AND rp.is_allowed = TRUE
    )
  );


-- Policy 7: Project admins can update users in their project
-- Only users with project.manage_roles permission can update users in that project
DROP POLICY if EXISTS users_update_project_admin ON public.users;


CREATE POLICY users_update_project_admin ON public.users
FOR UPDATE
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles admin_role
        JOIN public.user_roles target_role ON admin_role.project_id = target_role.project_id
        AND admin_role.project_id IS NOT NULL
        AND target_role.project_id IS NOT NULL
        JOIN public.role_permissions rp ON rp.role_id = admin_role.role_id
      WHERE
        admin_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = 'project.manage_roles'::permission_key
        AND rp.is_allowed = TRUE
    )
  )
WITH
  CHECK (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles admin_role
        JOIN public.user_roles target_role ON admin_role.project_id = target_role.project_id
        AND admin_role.project_id IS NOT NULL
        AND target_role.project_id IS NOT NULL
        JOIN public.role_permissions rp ON rp.role_id = admin_role.role_id
      WHERE
        admin_role.user_id = auth.uid ()
        AND target_role.user_id = users.id
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = 'project.manage_roles'::permission_key
        AND rp.is_allowed = TRUE
    )
  );


-- ============================================================================
-- USER_ROLES TABLE - Add policies for domain members to view roles
-- ============================================================================
-- Policy 8: Base members can view all roles in their base
-- Any user with ANY role in a base can view all roles in that same base
DROP POLICY if EXISTS user_roles_select_base_members ON public.user_roles;


CREATE POLICY user_roles_select_base_members ON public.user_roles FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles viewer_role
      WHERE
        viewer_role.user_id = auth.uid ()
        AND viewer_role.base_id IS NOT NULL
        AND viewer_role.base_id = user_roles.base_id
    )
  );


-- Policy 9: Partner org members can view all roles in their partner org
-- Any user with ANY role in a partner org can view all roles in that same partner org
DROP POLICY if EXISTS user_roles_select_partner_members ON public.user_roles;


CREATE POLICY user_roles_select_partner_members ON public.user_roles FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles viewer_role
      WHERE
        viewer_role.user_id = auth.uid ()
        AND viewer_role.partner_org_id IS NOT NULL
        AND viewer_role.partner_org_id = user_roles.partner_org_id
    )
  );


-- Policy 10: Project members can view all roles in their project
-- Any user with ANY role in a project can view all roles in that same project
DROP POLICY if EXISTS user_roles_select_project_members ON public.user_roles;


CREATE POLICY user_roles_select_project_members ON public.user_roles FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles viewer_role
      WHERE
        viewer_role.user_id = auth.uid ()
        AND viewer_role.project_id IS NOT NULL
        AND viewer_role.project_id = user_roles.project_id
    )
  );

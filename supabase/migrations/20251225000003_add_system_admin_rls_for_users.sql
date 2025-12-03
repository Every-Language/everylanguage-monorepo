-- Add System Admin RLS Policies for Users and User Roles
-- Allows system admins to view and manage all users and their role assignments
-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- System admins can view all users
CREATE POLICY users_select_system_admin ON public.users FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- System admins can update all users
CREATE POLICY users_update_system_admin ON public.users
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- System admins can insert users (for admin user creation)
CREATE POLICY users_insert_system_admin ON public.users FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- ============================================================================
-- USER_ROLES TABLE POLICIES
-- ============================================================================
-- System admins can view all user roles
CREATE POLICY user_roles_select_system_admin ON public.user_roles FOR
SELECT
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- System admins can insert user roles
CREATE POLICY user_roles_insert_system_admin ON public.user_roles FOR insert
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- System admins can update user roles
CREATE POLICY user_roles_update_system_admin ON public.user_roles
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );


-- System admins can delete user roles
CREATE POLICY user_roles_delete_system_admin ON public.user_roles FOR delete USING (
  public.has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    '00000000-0000-0000-0000-000000000000'::UUID
  )
);


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
comment ON policy users_select_system_admin ON public.users IS 'Allows system admins to view all users';


comment ON policy users_update_system_admin ON public.users IS 'Allows system admins to update any user';


comment ON policy users_insert_system_admin ON public.users IS 'Allows system admins to create new users';


comment ON policy user_roles_select_system_admin ON public.user_roles IS 'Allows system admins to view all user role assignments';


comment ON policy user_roles_insert_system_admin ON public.user_roles IS 'Allows system admins to assign roles to any user';


comment ON policy user_roles_update_system_admin ON public.user_roles IS 'Allows system admins to update any user role assignment';


comment ON policy user_roles_delete_system_admin ON public.user_roles IS 'Allows system admins to remove any user role assignment';

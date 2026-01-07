-- Consolidate Multiple Permissive Policies
-- Migration: 20251226000099_consolidate_permissive_policies.sql
-- ============================================================================
-- This migration consolidates multiple permissive policies per operation
-- into single policies per table/operation combination. This reduces RLS
-- complexity and improves query planning performance.
--
-- Tables affected:
-- - passages: 2 SELECT policies → 1
-- - user_bookmark_folders: 2 INSERT policies → 1
-- - user_bookmarks: 2 INSERT policies → 1
-- - user_roles: 4 SELECT policies → 1
-- - users: 2 INSERT, 4 SELECT, 4 UPDATE policies → 1 each
-- ============================================================================
-- ============================================================================
-- TABLE: passages
-- ============================================================================
-- Consolidate 2 SELECT policies into 1
-- "All users can view passages" (true) + "Users can view passages" (true OR created_by = auth.uid())
-- Result: true (since true OR anything = true)
DROP POLICY if EXISTS "All users can view passages" ON passages;


DROP POLICY if EXISTS "Users can view passages" ON passages;


CREATE POLICY "Users can view passages" ON passages FOR
SELECT
  USING (TRUE);


-- ============================================================================
-- TABLE: user_bookmark_folders
-- ============================================================================
-- Consolidate 2 INSERT policies into 1
-- Both check user_id = auth.uid(), but use different patterns
-- Use optimized (select auth.uid()) pattern
DROP POLICY if EXISTS "Users can insert their own bookmark folders" ON user_bookmark_folders;


DROP POLICY if EXISTS "Users can insert their own user_bookmark_folders" ON user_bookmark_folders;


CREATE POLICY "Users can insert their own bookmark folders" ON user_bookmark_folders FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        auth.uid ()
    )
  );


-- ============================================================================
-- TABLE: user_bookmarks
-- ============================================================================
-- Consolidate 2 INSERT policies into 1
-- Both check user_id = auth.uid(), but use different patterns
-- Use optimized (select auth.uid()) pattern
DROP POLICY if EXISTS "Users can insert their own bookmarks" ON user_bookmarks;


DROP POLICY if EXISTS "Users can insert their own user_bookmarks" ON user_bookmarks;


CREATE POLICY "Users can insert their own bookmarks" ON user_bookmarks FOR insert
WITH
  CHECK (
    user_id = (
      SELECT
        auth.uid ()
    )
  );


-- ============================================================================
-- TABLE: user_roles
-- ============================================================================
-- Consolidate 4 SELECT policies into 1
-- Combine all conditions with OR:
-- - is_base_member(base_id)
-- - is_partner_org_member(partner_org_id)
-- - is_project_member(project_id)
-- - user_roles_select_self_or_manager (user_id = auth.uid() OR manager permissions OR is_global)
DROP POLICY if EXISTS user_roles_select_base_members ON user_roles;


DROP POLICY if EXISTS user_roles_select_partner_members ON user_roles;


DROP POLICY if EXISTS user_roles_select_project_members ON user_roles;


DROP POLICY if EXISTS user_roles_select_self_or_manager ON user_roles;


CREATE POLICY user_roles_select_consolidated ON user_roles FOR
SELECT
  USING (
    is_base_member (base_id)
    OR is_partner_org_member (partner_org_id)
    OR is_project_member (project_id)
    OR (
      (
        user_id = (
          SELECT
            auth.uid ()
        )
      )
      OR (
        (project_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'project.manage_roles'::permission_key,
          'project'::resource_type,
          project_id
        )
      )
      OR (
        (base_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'base.manage_roles'::permission_key,
          'base'::resource_type,
          base_id
        )
      )
      OR (
        (partner_org_id IS NOT NULL)
        AND has_permission (
          (
            SELECT
              auth.uid ()
          ),
          'partner.manage_roles'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR (is_global = TRUE)
    )
  );


-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Consolidate INSERT policies: 2 → 1
DROP POLICY if EXISTS "Users can insert own profile" ON users;


DROP POLICY if EXISTS users_insert_system_admin ON users;


CREATE POLICY users_insert_consolidated ON users FOR insert
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
    OR has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- Consolidate SELECT policies: 4 → 1
DROP POLICY if EXISTS "Users can view own profile" ON users;


DROP POLICY if EXISTS users_select_base_members ON users;


DROP POLICY if EXISTS users_select_project_members ON users;


DROP POLICY if EXISTS users_select_system_admin ON users;


CREATE POLICY users_select_consolidated ON users FOR
SELECT
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            user_roles viewer_role
            JOIN user_roles target_role ON (
              (viewer_role.base_id = target_role.base_id)
              AND (viewer_role.base_id IS NOT NULL)
              AND (target_role.base_id IS NOT NULL)
            )
          )
        WHERE
          (
            (
              viewer_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
          )
      )
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            user_roles viewer_role
            JOIN user_roles target_role ON (
              (viewer_role.project_id = target_role.project_id)
              AND (viewer_role.project_id IS NOT NULL)
              AND (target_role.project_id IS NOT NULL)
            )
          )
        WHERE
          (
            (
              viewer_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
          )
      )
    )
    OR has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );


-- Consolidate UPDATE policies: 4 → 1
DROP POLICY if EXISTS "Users can update own profile" ON users;


DROP POLICY if EXISTS users_update_base_admin ON users;


DROP POLICY if EXISTS users_update_project_admin ON users;


DROP POLICY if EXISTS users_update_system_admin ON users;


CREATE POLICY users_update_consolidated ON users
FOR UPDATE
  USING (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (admin_role.base_id = target_role.base_id)
                AND (admin_role.base_id IS NOT NULL)
                AND (target_role.base_id IS NOT NULL)
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'base'::resource_type)
            AND (
              rp.permission_key = 'base.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (admin_role.project_id = target_role.project_id)
                AND (admin_role.project_id IS NOT NULL)
                AND (target_role.project_id IS NOT NULL)
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'project'::resource_type)
            AND (
              rp.permission_key = 'project.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
    OR has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  )
WITH
  CHECK (
    (
      (
        SELECT
          auth.uid ()
      ) = id
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (admin_role.base_id = target_role.base_id)
                AND (admin_role.base_id IS NOT NULL)
                AND (target_role.base_id IS NOT NULL)
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'base'::resource_type)
            AND (
              rp.permission_key = 'base.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
    OR (
      EXISTS (
        SELECT
          1
        FROM
          (
            (
              user_roles admin_role
              JOIN user_roles target_role ON (
                (admin_role.project_id = target_role.project_id)
                AND (admin_role.project_id IS NOT NULL)
                AND (target_role.project_id IS NOT NULL)
              )
            )
            JOIN role_permissions rp ON ((rp.role_id = admin_role.role_id))
          )
        WHERE
          (
            (
              admin_role.user_id = (
                SELECT
                  auth.uid ()
              )
            )
            AND (target_role.user_id = users.id)
            AND (rp.resource_type = 'project'::resource_type)
            AND (
              rp.permission_key = 'project.manage_roles'::permission_key
            )
            AND (rp.is_allowed = TRUE)
          )
      )
    )
    OR has_permission (
      (
        SELECT
          auth.uid ()
      ),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );

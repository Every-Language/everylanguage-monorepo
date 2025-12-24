-- Add missing RLS policies and remove old conflicting policies
-- This migration ensures all project and user domain tables have complete RLS coverage
-- ============================================================================
-- REMOVE OLD POLICIES
-- ============================================================================
-- Remove old media_files_verses ownership policy
DROP POLICY if EXISTS "Users can delete own media_files_verses" ON public.media_files_verses;


-- Remove old user_roles policies
DROP POLICY if EXISTS "Allow Public Insert" ON public.user_roles;


DROP POLICY if EXISTS "Users can view user_roles" ON public.user_roles;


-- ============================================================================
-- PROJECTS TABLE - Add UPDATE and DELETE policies
-- ============================================================================
DROP POLICY if EXISTS projects_update_with_permission ON public.projects;


CREATE POLICY projects_update_with_permission ON public.projects
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'project.write', 'project', id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'project.write', 'project', id)
  );


DROP POLICY if EXISTS projects_delete_with_permission ON public.projects;


CREATE POLICY projects_delete_with_permission ON public.projects FOR delete USING (
  public.has_permission (auth.uid (), 'project.delete', 'project', id)
);


-- ============================================================================
-- PROJECT_UPDATES TABLE - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
DROP POLICY if EXISTS project_updates_insert ON public.project_updates;


CREATE POLICY project_updates_insert ON public.project_updates FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS project_updates_update ON public.project_updates;


CREATE POLICY project_updates_update ON public.project_updates
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  )
WITH
  CHECK (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id
    )
  );


DROP POLICY if EXISTS project_updates_delete ON public.project_updates;


CREATE POLICY project_updates_delete ON public.project_updates
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.has_permission (
      auth.uid (),
      'project.delete',
      'project',
      project_id
    )
  )
WITH
  CHECK (deleted_at IS NOT NULL);


-- ============================================================================
-- PROJECT_UPDATES_MEDIA TABLE - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
DROP POLICY if EXISTS project_updates_media_insert ON public.project_updates_media;


CREATE POLICY project_updates_media_insert ON public.project_updates_media FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  );


DROP POLICY if EXISTS project_updates_media_update ON public.project_updates_media;


CREATE POLICY project_updates_media_update ON public.project_updates_media
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  )
WITH
  CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.write',
          'project',
          pu.project_id
        )
    )
  );


DROP POLICY if EXISTS project_updates_media_delete ON public.project_updates_media;


CREATE POLICY project_updates_media_delete ON public.project_updates_media
FOR UPDATE
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT
        1
      FROM
        public.project_updates pu
      WHERE
        pu.id = project_updates_media.project_update_id
        AND pu.deleted_at IS NULL
        AND public.has_permission (
          auth.uid (),
          'project.delete',
          'project',
          pu.project_id
        )
    )
  )
WITH
  CHECK (deleted_at IS NOT NULL);


-- ============================================================================
-- BASES TABLE - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
DROP POLICY if EXISTS bases_insert_with_permission ON public.bases;


CREATE POLICY bases_insert_with_permission ON public.bases FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE
        ur.user_id = auth.uid ()
        AND rp.resource_type = 'global'::resource_type
        AND rp.permission_key = 'system.admin'::permission_key
        AND rp.is_allowed = TRUE
      LIMIT
        1
    )
  );


DROP POLICY if EXISTS bases_update_with_permission ON public.bases;


CREATE POLICY bases_update_with_permission ON public.bases
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'base.write', 'base', id)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'base.write', 'base', id)
  );


DROP POLICY if EXISTS bases_delete_with_permission ON public.bases;


CREATE POLICY bases_delete_with_permission ON public.bases FOR delete USING (
  public.has_permission (auth.uid (), 'base.delete', 'base', id)
);


-- ============================================================================
-- PARTNER_ORGS TABLE - Add INSERT, UPDATE, DELETE policies
-- ============================================================================
DROP POLICY if EXISTS partner_orgs_insert_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_insert_with_permission ON public.partner_orgs FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      WHERE
        ur.user_id = auth.uid ()
        AND rp.resource_type = 'global'::resource_type
        AND rp.permission_key = 'system.admin'::permission_key
        AND rp.is_allowed = TRUE
      LIMIT
        1
    )
  );


DROP POLICY if EXISTS partner_orgs_update_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_update_with_permission ON public.partner_orgs
FOR UPDATE
  USING (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      id
    )
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      id
    )
  );


DROP POLICY if EXISTS partner_orgs_delete_with_permission ON public.partner_orgs;


CREATE POLICY partner_orgs_delete_with_permission ON public.partner_orgs FOR delete USING (
  public.has_permission (
    auth.uid (),
    'partner.manage_roles',
    'partner',
    id
  )
);


-- ============================================================================
-- USER_ROLES TABLE - Replace old policies with new manage_roles-based policies
-- ============================================================================
-- These policies should already exist from migration 20251226000008, but ensure they're correct
DROP POLICY if EXISTS user_roles_select_self_or_manager ON public.user_roles;


CREATE POLICY user_roles_select_self_or_manager ON public.user_roles FOR
SELECT
  USING (
    user_id = auth.uid ()
    OR CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_insert_with_manage ON public.user_roles;


CREATE POLICY user_roles_insert_with_manage ON public.user_roles FOR insert
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_update_with_manage ON public.user_roles;


CREATE POLICY user_roles_update_with_manage ON public.user_roles
FOR UPDATE
  USING (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  )
WITH
  CHECK (
    CASE context_type
      WHEN 'project' THEN public.has_permission (
        auth.uid (),
        'project.manage_roles',
        'project',
        context_id::UUID
      )
      WHEN 'base' THEN public.has_permission (
        auth.uid (),
        'base.manage_roles',
        'base',
        context_id::UUID
      )
      WHEN 'partner' THEN public.has_permission (
        auth.uid (),
        'partner.manage_roles',
        'partner',
        context_id::UUID
      )
      ELSE FALSE
    END
  );


DROP POLICY if EXISTS user_roles_delete_with_manage ON public.user_roles;


CREATE POLICY user_roles_delete_with_manage ON public.user_roles FOR delete USING (
  CASE context_type
    WHEN 'project' THEN public.has_permission (
      auth.uid (),
      'project.manage_roles',
      'project',
      context_id::UUID
    )
    WHEN 'base' THEN public.has_permission (
      auth.uid (),
      'base.manage_roles',
      'base',
      context_id::UUID
    )
    WHEN 'partner' THEN public.has_permission (
      auth.uid (),
      'partner.manage_roles',
      'partner',
      context_id::UUID
    )
    ELSE FALSE
  END
);


-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Add SELECT policy for system admins
-- ============================================================================
DROP POLICY if EXISTS role_permissions_select_allowed ON public.role_permissions;


CREATE POLICY role_permissions_select_allowed ON public.role_permissions FOR
SELECT
  USING (
    auth.role () = 'service_role'
    OR public.has_permission (
      auth.uid (),
      'system.admin',
      'global',
      '00000000-0000-0000-0000-000000000000'::UUID
    )
  );

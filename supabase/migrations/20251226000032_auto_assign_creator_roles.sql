-- Auto-assign creator roles for projects, partner_orgs, and bases
-- Migration: 20251226000032_auto_assign_creator_roles.sql
-- This migration:
-- 1. Backfills user_roles for existing entities where creators don't have roles
-- 2. Creates triggers to automatically assign admin roles to creators on INSERT
-- ============================================================================
-- ============================================================================
-- GET ROLE IDs (using role_key lookup for flexibility)
-- ============================================================================
DO $$
DECLARE
  project_admin_role_id UUID;
  partner_admin_role_id UUID;
  base_admin_role_id UUID;
BEGIN
  -- Get role IDs by role_key
  SELECT id INTO project_admin_role_id FROM roles WHERE role_key = 'project_admin' AND resource_type = 'project' LIMIT 1;
  SELECT id INTO partner_admin_role_id FROM roles WHERE role_key = 'partner_admin' AND resource_type = 'partner' LIMIT 1;
  SELECT id INTO base_admin_role_id FROM roles WHERE role_key = 'base_admin' AND resource_type = 'base' LIMIT 1;

  -- Backfill only if roles exist (roles may be created in seed files)
  -- ============================================================================
  -- BACKFILL: Assign roles to creators of existing projects
  -- ============================================================================
  IF project_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, project_id, role_id, created_at, updated_at)
    SELECT 
      p.created_by,
      p.id,
      project_admin_role_id,
      p.created_at,
      NOW()
    FROM projects p
    WHERE p.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.project_id = p.id 
        AND ur.user_id = p.created_by
      )
    ON CONFLICT (user_id, project_id) WHERE project_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

  -- ============================================================================
  -- BACKFILL: Assign roles to creators of existing partner_orgs
  -- ============================================================================
  IF partner_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, partner_org_id, role_id, created_at, updated_at)
    SELECT 
      po.created_by,
      po.id,
      partner_admin_role_id,
      po.created_at,
      NOW()
    FROM partner_orgs po
    WHERE po.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.partner_org_id = po.id 
        AND ur.user_id = po.created_by
      )
    ON CONFLICT (user_id, partner_org_id) WHERE partner_org_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

  -- ============================================================================
  -- BACKFILL: Assign roles to creators of existing bases
  -- ============================================================================
  IF base_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, base_id, role_id, created_at, updated_at)
    SELECT 
      b.created_by,
      b.id,
      base_admin_role_id,
      b.created_at,
      NOW()
    FROM bases b
    WHERE b.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.base_id = b.id 
        AND ur.user_id = b.created_by
      )
    ON CONFLICT (user_id, base_id) WHERE base_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

END $$;


-- ============================================================================
-- CREATE TRIGGER FUNCTION FOR PROJECTS
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_project_creator_role () returns trigger AS $$
DECLARE
  project_admin_role_id UUID;
BEGIN
  -- Get role ID dynamically (in case it changes)
  SELECT id INTO project_admin_role_id 
  FROM roles 
  WHERE role_key = 'project_admin' AND resource_type = 'project' 
  LIMIT 1;

  -- Only assign role if creator exists and role exists
  IF NEW.created_by IS NOT NULL AND project_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, project_id, role_id, created_at, updated_at)
    VALUES (NEW.created_by, NEW.id, project_admin_role_id, NOW(), NOW())
    ON CONFLICT (user_id, project_id) WHERE project_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ language plpgsql security definer;


comment ON function assign_project_creator_role IS 'Automatically assigns project_admin role to project creator on INSERT';


-- ============================================================================
-- CREATE TRIGGER FUNCTION FOR PARTNER ORGS
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_partner_org_creator_role () returns trigger AS $$
DECLARE
  partner_admin_role_id UUID;
BEGIN
  -- Get role ID dynamically (in case it changes)
  SELECT id INTO partner_admin_role_id 
  FROM roles 
  WHERE role_key = 'partner_admin' AND resource_type = 'partner' 
  LIMIT 1;

  -- Only assign role if creator exists and role exists
  IF NEW.created_by IS NOT NULL AND partner_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, partner_org_id, role_id, created_at, updated_at)
    VALUES (NEW.created_by, NEW.id, partner_admin_role_id, NOW(), NOW())
    ON CONFLICT (user_id, partner_org_id) WHERE partner_org_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ language plpgsql security definer;


comment ON function assign_partner_org_creator_role IS 'Automatically assigns partner_admin role to partner org creator on INSERT';


-- ============================================================================
-- CREATE TRIGGER FUNCTION FOR BASES
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_base_creator_role () returns trigger AS $$
DECLARE
  base_admin_role_id UUID;
BEGIN
  -- Get role ID dynamically (in case it changes)
  SELECT id INTO base_admin_role_id 
  FROM roles 
  WHERE role_key = 'base_admin' AND resource_type = 'base' 
  LIMIT 1;

  -- Only assign role if creator exists and role exists
  IF NEW.created_by IS NOT NULL AND base_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, base_id, role_id, created_at, updated_at)
    VALUES (NEW.created_by, NEW.id, base_admin_role_id, NOW(), NOW())
    ON CONFLICT (user_id, base_id) WHERE base_id IS NOT NULL 
    DO UPDATE SET role_id = EXCLUDED.role_id, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ language plpgsql security definer;


comment ON function assign_base_creator_role IS 'Automatically assigns base_admin role to base creator on INSERT';


-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================
-- Drop triggers if they exist (for idempotency)
DROP TRIGGER if EXISTS assign_project_creator_role_trigger ON projects;


DROP TRIGGER if EXISTS assign_partner_org_creator_role_trigger ON partner_orgs;


DROP TRIGGER if EXISTS assign_base_creator_role_trigger ON bases;


-- Create triggers
CREATE TRIGGER assign_project_creator_role_trigger
AFTER insert ON projects FOR each ROW
EXECUTE function assign_project_creator_role ();


CREATE TRIGGER assign_partner_org_creator_role_trigger
AFTER insert ON partner_orgs FOR each ROW
EXECUTE function assign_partner_org_creator_role ();


CREATE TRIGGER assign_base_creator_role_trigger
AFTER insert ON bases FOR each ROW
EXECUTE function assign_base_creator_role ();

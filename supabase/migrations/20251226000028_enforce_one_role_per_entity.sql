-- Enforce one role per entity constraint
-- Migration: 20251226000028_enforce_one_role_per_entity.sql
-- This migration enforces that each user can only have ONE role per entity
-- ============================================================================
-- ============================================================================
-- CREATE HELPER FUNCTION TO DETERMINE ROLE PRIORITY
-- ============================================================================
-- This function calculates a priority score for roles to determine which role
-- to keep when a user has multiple roles for the same entity.
-- Higher score = higher priority (keep this role)
CREATE OR REPLACE FUNCTION public.get_role_priority (role_id UUID) returns INTEGER AS $$
DECLARE
  perm_count INTEGER;
  has_admin BOOLEAN;
  has_manage_roles BOOLEAN;
  role_key_val TEXT;
BEGIN
  -- Get role key for pattern matching
  SELECT r.role_key INTO role_key_val
  FROM roles r
  WHERE r.id = role_id;
  
  -- Count permissions as proxy for privilege level
  SELECT COUNT(*) INTO perm_count
  FROM role_permissions rp
  WHERE rp.role_id = get_role_priority.role_id
    AND rp.is_allowed = TRUE;
  
  -- Check if has admin/manage permissions (higher priority)
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = get_role_priority.role_id
    AND rp.is_allowed = TRUE
    AND (rp.permission_key::text LIKE '%.admin' 
         OR rp.permission_key::text LIKE '%.manage_roles')
  ) INTO has_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = get_role_priority.role_id
    AND rp.is_allowed = TRUE
    AND rp.permission_key::text LIKE '%.manage_roles'
  ) INTO has_manage_roles;
  
  -- Return priority score:
  -- - Admin roles with manage_roles: 10000 + perm_count
  -- - Admin roles: 5000 + perm_count
  -- - Roles with manage_roles: 2000 + perm_count
  -- - Others: perm_count
  -- Also boost by role_key pattern (admin > editor > leader > member > viewer)
  RETURN 
    CASE 
      WHEN has_admin AND has_manage_roles THEN 10000 + perm_count
      WHEN has_admin THEN 5000 + perm_count
      WHEN has_manage_roles THEN 2000 + perm_count
      WHEN role_key_val LIKE '%_admin' THEN 1000 + perm_count
      WHEN role_key_val LIKE '%_editor' OR role_key_val LIKE '%_leader' THEN 500 + perm_count
      WHEN role_key_val LIKE '%_staff' THEN 300 + perm_count
      WHEN role_key_val LIKE '%_member' THEN 100 + perm_count
      WHEN role_key_val LIKE '%_viewer' OR role_key_val LIKE '%_checker' THEN perm_count
      ELSE perm_count
    END;
END;
$$ language plpgsql stable;


comment ON function public.get_role_priority IS 'Calculates priority score for roles. Higher score = higher privilege. Used to determine which role to keep when user has multiple roles for same entity.';


-- ============================================================================
-- MIGRATE DUPLICATE ROLES (KEEP HIGHEST PRIORITY)
-- ============================================================================
-- For projects: keep role with highest priority per (user_id, project_id)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_roles AS (
    SELECT 
      ur.id,
      ur.user_id,
      ur.project_id,
      ur.role_id,
      ROW_NUMBER() OVER (
        PARTITION BY ur.user_id, ur.project_id 
        ORDER BY public.get_role_priority(ur.role_id) DESC, ur.created_at DESC
      ) as rn
    FROM user_roles ur
    WHERE ur.project_id IS NOT NULL
  )
  DELETE FROM user_roles
  WHERE id IN (
    SELECT id FROM ranked_roles WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate project roles, kept highest priority role for each user-project pair', deleted_count;
END $$;


-- For bases: keep role with highest priority per (user_id, base_id)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_roles AS (
    SELECT 
      ur.id,
      ur.user_id,
      ur.base_id,
      ur.role_id,
      ROW_NUMBER() OVER (
        PARTITION BY ur.user_id, ur.base_id 
        ORDER BY public.get_role_priority(ur.role_id) DESC, ur.created_at DESC
      ) as rn
    FROM user_roles ur
    WHERE ur.base_id IS NOT NULL
  )
  DELETE FROM user_roles
  WHERE id IN (
    SELECT id FROM ranked_roles WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate base roles, kept highest priority role for each user-base pair', deleted_count;
END $$;


-- For partner orgs: keep role with highest priority per (user_id, partner_org_id)
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH ranked_roles AS (
    SELECT 
      ur.id,
      ur.user_id,
      ur.partner_org_id,
      ur.role_id,
      ROW_NUMBER() OVER (
        PARTITION BY ur.user_id, ur.partner_org_id 
        ORDER BY public.get_role_priority(ur.role_id) DESC, ur.created_at DESC
      ) as rn
    FROM user_roles ur
    WHERE ur.partner_org_id IS NOT NULL
  )
  DELETE FROM user_roles
  WHERE id IN (
    SELECT id FROM ranked_roles WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate partner org roles, kept highest priority role for each user-partner pair', deleted_count;
END $$;


-- ============================================================================
-- DROP OLD UNIQUE CONSTRAINTS
-- ============================================================================
DROP INDEX if EXISTS user_roles_user_role_project_unique;


DROP INDEX if EXISTS user_roles_user_role_base_unique;


DROP INDEX if EXISTS user_roles_user_role_partner_unique;


-- ============================================================================
-- ADD NEW UNIQUE CONSTRAINTS (ONE ROLE PER ENTITY)
-- ============================================================================
-- One role per user per project
CREATE UNIQUE INDEX user_roles_user_project_unique ON public.user_roles (user_id, project_id)
WHERE
  project_id IS NOT NULL;


-- One role per user per base
CREATE UNIQUE INDEX user_roles_user_base_unique ON public.user_roles (user_id, base_id)
WHERE
  base_id IS NOT NULL;


-- One role per user per partner org
CREATE UNIQUE INDEX user_roles_user_partner_unique ON public.user_roles (user_id, partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


-- Global roles: keep existing constraint (one role per user per role)
-- (user_roles_user_role_global_unique already exists from migration 20251226000015)
-- ============================================================================
-- CREATE TRIGGER FUNCTION TO ENFORCE CONSTRAINT ON INSERT
-- ============================================================================
-- This trigger automatically updates existing role instead of inserting duplicate
CREATE OR REPLACE FUNCTION public.enforce_one_role_per_entity () returns trigger AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- If inserting a role for an entity where user already has a role, update instead
  IF NEW.project_id IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM user_roles 
    WHERE user_id = NEW.user_id AND project_id = NEW.project_id;
    
    IF existing_id IS NOT NULL THEN
      UPDATE user_roles 
      SET role_id = NEW.role_id, updated_at = NOW()
      WHERE id = existing_id;
      RETURN NULL; -- Prevent INSERT
    END IF;
  ELSIF NEW.base_id IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM user_roles 
    WHERE user_id = NEW.user_id AND base_id = NEW.base_id;
    
    IF existing_id IS NOT NULL THEN
      UPDATE user_roles 
      SET role_id = NEW.role_id, updated_at = NOW()
      WHERE id = existing_id;
      RETURN NULL; -- Prevent INSERT
    END IF;
  ELSIF NEW.partner_org_id IS NOT NULL THEN
    SELECT id INTO existing_id
    FROM user_roles 
    WHERE user_id = NEW.user_id AND partner_org_id = NEW.partner_org_id;
    
    IF existing_id IS NOT NULL THEN
      UPDATE user_roles 
      SET role_id = NEW.role_id, updated_at = NOW()
      WHERE id = existing_id;
      RETURN NULL; -- Prevent INSERT
    END IF;
  END IF;
  
  RETURN NEW; -- Allow INSERT if no existing role
END;
$$ language plpgsql;


comment ON function public.enforce_one_role_per_entity IS 'Trigger function that enforces one role per entity by updating existing role instead of inserting duplicate.';


-- Create trigger
DROP TRIGGER if EXISTS enforce_one_role_per_entity_trigger ON user_roles;


CREATE TRIGGER enforce_one_role_per_entity_trigger before insert ON user_roles FOR each ROW
EXECUTE function public.enforce_one_role_per_entity ();

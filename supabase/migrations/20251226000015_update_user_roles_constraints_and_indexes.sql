-- Update user_roles constraints and indexes
-- Migration: 20251226000015_update_user_roles_constraints_and_indexes.sql
-- This migration drops old constraints/indexes and adds new unique constraints and partial indexes
-- ============================================================================
-- DROP OLD UNIQUE CONSTRAINT
-- ============================================================================
ALTER TABLE public.user_roles
DROP CONSTRAINT if EXISTS user_roles_user_id_role_id_context_type_context_id_key;


-- ============================================================================
-- ADD NEW UNIQUE CONSTRAINTS WITH PARTIAL INDEXES
-- ============================================================================
-- Project roles: unique per user per role per project
CREATE UNIQUE INDEX user_roles_user_role_project_unique ON public.user_roles (user_id, role_id, project_id)
WHERE
  project_id IS NOT NULL;


-- Base roles: unique per user per role per base
CREATE UNIQUE INDEX user_roles_user_role_base_unique ON public.user_roles (user_id, role_id, base_id)
WHERE
  base_id IS NOT NULL;


-- Partner roles: unique per user per role per partner org
CREATE UNIQUE INDEX user_roles_user_role_partner_unique ON public.user_roles (user_id, role_id, partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


-- Global roles: unique per user per role (only one global role per user per role)
CREATE UNIQUE INDEX user_roles_user_role_global_unique ON public.user_roles (user_id, role_id)
WHERE
  is_global = TRUE;


-- ============================================================================
-- DROP OLD INDEXES
-- ============================================================================
DROP INDEX if EXISTS idx_user_roles_context_type;


DROP INDEX if EXISTS idx_user_roles_context_id;


DROP INDEX if EXISTS idx_user_roles_user_context;


-- ============================================================================
-- CREATE NEW PARTIAL INDEXES FOR PERFORMANCE
-- ============================================================================
-- Indexes for user lookups by context
CREATE INDEX if NOT EXISTS idx_user_roles_user_project ON public.user_roles (user_id, project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_user_roles_user_base ON public.user_roles (user_id, base_id)
WHERE
  base_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_user_roles_user_partner ON public.user_roles (user_id, partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


-- Indexes for context ID lookups (for permission checks)
CREATE INDEX if NOT EXISTS idx_user_roles_project_id ON public.user_roles (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_user_roles_base_id ON public.user_roles (base_id)
WHERE
  base_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_user_roles_partner_org_id ON public.user_roles (partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


-- Index for global roles
CREATE INDEX if NOT EXISTS idx_user_roles_is_global ON public.user_roles (user_id)
WHERE
  is_global = TRUE;

-- Drop old context_type and context_id columns from user_roles table
-- Migration: 20251226000022_drop_user_roles_old_columns.sql
-- This migration drops the old polymorphic columns and adds comments to new columns
-- ============================================================================
-- DROP OLD COLUMNS
-- ============================================================================
ALTER TABLE public.user_roles
DROP COLUMN IF EXISTS context_type,
DROP COLUMN IF EXISTS context_id;


-- ============================================================================
-- ADD COLUMN COMMENTS
-- ============================================================================
comment ON COLUMN public.user_roles.project_id IS 'ID of the project this role assignment applies to. NULL if not a project-scoped role.';


comment ON COLUMN public.user_roles.base_id IS 'ID of the base this role assignment applies to. NULL if not a base-scoped role.';


comment ON COLUMN public.user_roles.partner_org_id IS 'ID of the partner organization this role assignment applies to. NULL if not a partner-scoped role.';


comment ON COLUMN public.user_roles.is_global IS 'TRUE if this is a global/system-wide role assignment. Only one of project_id, base_id, partner_org_id, or is_global should be set.';

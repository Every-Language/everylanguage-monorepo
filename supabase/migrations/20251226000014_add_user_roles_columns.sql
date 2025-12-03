-- Add new columns to user_roles table and migrate data from polymorphic pattern
-- Migration: 20251226000014_add_user_roles_columns.sql
-- This migration adds project_id, base_id, partner_org_id, and is_global columns
-- and migrates existing data from context_type/context_id pattern
-- ============================================================================
-- PRE-MIGRATION VALIDATION
-- ============================================================================
-- Check for invalid context_id references
DO $$
DECLARE
  invalid_project_count INTEGER;
  invalid_base_count INTEGER;
  invalid_partner_count INTEGER;
BEGIN
  -- Check for invalid project references
  SELECT COUNT(*) INTO invalid_project_count
  FROM public.user_roles ur
  WHERE ur.context_type = 'project'
    AND ur.context_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = ur.context_id::UUID
    );
  
  IF invalid_project_count > 0 THEN
    RAISE WARNING 'Found % invalid project references in user_roles', invalid_project_count;
  END IF;

  -- Check for invalid base references
  SELECT COUNT(*) INTO invalid_base_count
  FROM public.user_roles ur
  WHERE ur.context_type = 'base'
    AND ur.context_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.bases b WHERE b.id = ur.context_id::UUID
    );
  
  IF invalid_base_count > 0 THEN
    RAISE WARNING 'Found % invalid base references in user_roles', invalid_base_count;
  END IF;

  -- Check for invalid partner references
  SELECT COUNT(*) INTO invalid_partner_count
  FROM public.user_roles ur
  WHERE ur.context_type IN ('partner', 'partner_org', 'partner_orgs')
    AND ur.context_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.partner_orgs po WHERE po.id = ur.context_id::UUID
    );
  
  IF invalid_partner_count > 0 THEN
    RAISE WARNING 'Found % invalid partner references in user_roles', invalid_partner_count;
  END IF;
END $$;


-- ============================================================================
-- ADD NEW COLUMNS
-- ============================================================================
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS project_id UUID,
ADD COLUMN IF NOT EXISTS base_id UUID,
ADD COLUMN IF NOT EXISTS partner_org_id UUID,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE NOT NULL;


-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- Note: We'll add these after data migration to avoid constraint violations
-- These will be added in a later step after data is migrated
-- ============================================================================
-- DATA MIGRATION
-- ============================================================================
-- Migrate project roles
UPDATE public.user_roles
SET
  project_id = context_id::UUID
WHERE
  context_type = 'project'
  AND context_id IS NOT NULL
  AND project_id IS NULL;


-- Migrate base roles
UPDATE public.user_roles
SET
  base_id = context_id::UUID
WHERE
  context_type = 'base'
  AND context_id IS NOT NULL
  AND base_id IS NULL;


-- Migrate partner roles (handle multiple context_type values)
UPDATE public.user_roles
SET
  partner_org_id = context_id::UUID
WHERE
  context_type IN ('partner', 'partner_org', 'partner_orgs')
  AND context_id IS NOT NULL
  AND partner_org_id IS NULL;


-- Migrate global roles (context_type is 'global' or NULL, context_id is NULL)
-- Only migrate rows that don't already have a context set
UPDATE public.user_roles
SET
  is_global = TRUE
WHERE
  (
    context_type = 'global'
    OR (
      context_type IS NULL
      AND context_id IS NULL
    )
  )
  AND context_id IS NULL
  AND project_id IS NULL
  AND base_id IS NULL
  AND partner_org_id IS NULL
  AND is_global = FALSE;


-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================
DO $$
DECLARE
  project_count INTEGER;
  base_count INTEGER;
  partner_count INTEGER;
  global_count INTEGER;
  total_old INTEGER;
  total_new INTEGER;
BEGIN
  -- Count migrated rows
  SELECT COUNT(*) INTO project_count FROM public.user_roles WHERE project_id IS NOT NULL;
  SELECT COUNT(*) INTO base_count FROM public.user_roles WHERE base_id IS NOT NULL;
  SELECT COUNT(*) INTO partner_count FROM public.user_roles WHERE partner_org_id IS NOT NULL;
  SELECT COUNT(*) INTO global_count FROM public.user_roles WHERE is_global = TRUE;
  
  -- Count original rows
  SELECT COUNT(*) INTO total_old FROM public.user_roles;
  SELECT COUNT(*) INTO total_new FROM public.user_roles 
    WHERE project_id IS NOT NULL 
       OR base_id IS NOT NULL 
       OR partner_org_id IS NOT NULL 
       OR is_global = TRUE;
  
  -- Verify all rows were migrated
  IF total_old != total_new THEN
    RAISE EXCEPTION 'Data migration failed: Expected % rows, but found % rows with context', total_old, total_new;
  END IF;
  
  RAISE NOTICE 'Migration complete: % project roles, % base roles, % partner roles, % global roles', 
    project_count, base_count, partner_count, global_count;
END $$;


-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (after data migration)
-- ============================================================================
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_project_id_fkey FOREIGN key (project_id) REFERENCES public.projects (id) ON DELETE CASCADE;


ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_base_id_fkey FOREIGN key (base_id) REFERENCES public.bases (id) ON DELETE CASCADE;


ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_partner_org_id_fkey FOREIGN key (partner_org_id) REFERENCES public.partner_orgs (id) ON DELETE CASCADE;


-- ============================================================================
-- ADD CHECK CONSTRAINT
-- ============================================================================
-- Ensure exactly one context column is set OR is_global = TRUE
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_context_check CHECK (
  (
    (project_id IS NOT NULL)::INTEGER + (base_id IS NOT NULL)::INTEGER + (partner_org_id IS NOT NULL)::INTEGER + (is_global = TRUE)::INTEGER
  ) = 1
);

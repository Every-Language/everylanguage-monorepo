-- Update check_project_permission function to use new column structure
-- Migration: 20251226000019_update_check_project_permission_function.sql
-- This migration updates check_project_permission() to use project_id, base_id, partner_org_id instead of context_type/context_id
CREATE OR REPLACE FUNCTION public.check_project_permission (
  p_user_id UUID,
  p_action permission_key,
  p_project_id UUID
) returns BOOLEAN language plpgsql stable AS $$
BEGIN
  -- 1) Direct role on project
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.project_id = p_project_id
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 2) Base-project inheritance
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_base
    JOIN public.bases_projects bp
      ON ur_base.base_id = bp.base_id
     AND bp.project_id = p_project_id
     AND bp.unassigned_at IS NULL
    JOIN public.role_permissions rp ON rp.role_id = ur_base.role_id
    WHERE ur_base.user_id = p_user_id
      AND ur_base.base_id IS NOT NULL
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 3) Partner-project inheritance
  -- Note: partner_orgs_projects is a view that already filters to active allocations
  -- (effective_to IS NULL OR effective_to >= current_date), so no unassigned_at check needed
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_partner
    JOIN public.partner_orgs_projects pop
      ON ur_partner.partner_org_id = pop.partner_org_id
     AND pop.project_id = p_project_id
    JOIN public.role_permissions rp ON rp.role_id = ur_partner.role_id
    WHERE ur_partner.user_id = p_user_id
      AND ur_partner.partner_org_id IS NOT NULL
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

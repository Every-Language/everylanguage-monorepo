-- Update check_project_permission function to add unassigned_at IS NULL check
-- This is required now that partner_orgs_projects is a table instead of a view
-- The view previously filtered to active allocations only, but the table needs explicit filtering
-- Also uses the new column structure (project_id, base_id, partner_org_id instead of context_type/context_id)
CREATE OR REPLACE FUNCTION public.check_project_permission (
  p_user_id UUID,
  p_action permission_key,
  p_project_id UUID
) returns BOOLEAN language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
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
  -- Note: partner_orgs_projects is now a table, so we need to filter unassigned_at IS NULL
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_partner
    JOIN public.partner_orgs_projects pop
      ON ur_partner.partner_org_id = pop.partner_org_id
     AND pop.project_id = p_project_id
     AND pop.unassigned_at IS NULL
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

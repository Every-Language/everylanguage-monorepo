-- Fix partner orgs projects view and permission function
-- 1. Rename partner_org_projects_via_donations view to partner_orgs_projects
-- 2. Update check_project_permission to remove unassigned_at check (view already filters to active allocations)
-- Rename the view to match what the function expects
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'partner_org_projects_via_donations'
  ) THEN
    ALTER VIEW public.partner_org_projects_via_donations 
      RENAME TO partner_orgs_projects;
  END IF;
END $$;


-- Update check_project_permission function to remove unassigned_at check
-- The view already filters to only active allocations (effective_to IS NULL OR effective_to >= current_date)
-- so the unassigned_at check is redundant
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
      AND ur.context_type = 'project'
      AND ur.context_id::UUID = p_project_id
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
      ON ur_base.context_id::UUID = bp.base_id
     AND bp.project_id = p_project_id
     AND bp.unassigned_at IS NULL
    JOIN public.role_permissions rp ON rp.role_id = ur_base.role_id
    WHERE ur_base.user_id = p_user_id
      AND ur_base.context_type = 'base'
      AND rp.resource_type = 'project'::resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 3) Partner-project inheritance
  -- Note: partner_orgs_projects view already filters to active allocations only
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur_partner
    JOIN public.partner_orgs_projects pop
      ON ur_partner.context_id::UUID = pop.partner_org_id
     AND pop.project_id = p_project_id
    JOIN public.role_permissions rp ON rp.role_id = ur_partner.role_id
    WHERE ur_partner.user_id = p_user_id
      AND ur_partner.context_type = 'partner'
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

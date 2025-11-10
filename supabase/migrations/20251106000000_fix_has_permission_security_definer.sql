-- Fix has_permission function to use SECURITY DEFINER
-- This prevents infinite recursion when RLS policies call has_permission(),
-- which in turn queries tables with RLS policies.
-- ============================================================================
-- Recreate has_permission as SECURITY DEFINER
-- This allows the function to bypass RLS when checking user permissions
CREATE OR REPLACE FUNCTION public.has_permission (
  p_user_id UUID,
  p_action permission_key,
  p_resource_type resource_type,
  p_resource_id UUID
) returns BOOLEAN language plpgsql stable security definer -- This is the key change - function runs with elevated privileges
SET
  search_path = public,
  pg_temp -- Security best practice
  AS $$
BEGIN
  -- 1) System admin shortcut
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND rp.resource_type = 'global'::resource_type
      AND rp.permission_key = 'system.admin'::permission_key
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 2) Ownership shortcut (resource-specific)
  IF p_resource_type = 'project'::resource_type THEN
    IF EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = p_resource_id
        AND pr.created_by = p_user_id
      LIMIT 1
    ) THEN
      -- Project owners can read/write; DELETE still requires explicit permission
      IF p_action IN ('project.read'::permission_key, 'project.write'::permission_key) THEN
        RETURN true;
      END IF;
    END IF;
  ELSIF p_resource_type = 'partner'::resource_type THEN
    IF EXISTS (
      SELECT 1 FROM public.partner_orgs po
      WHERE po.id = p_resource_id
        AND po.created_by = p_user_id
      LIMIT 1
    ) THEN
      IF p_action IN ('partner.read'::permission_key, 'partner.manage_roles'::permission_key) THEN
        RETURN true;
      END IF;
    END IF;
  END IF;

  -- 3) Direct role on resource
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.context_type::text = p_resource_type::text
      AND ur.context_id = p_resource_id
      AND rp.resource_type = p_resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- 4) Team inheritance
  IF p_resource_type = 'project'::resource_type THEN
    -- (a) via projects_teams (team → project)
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.projects_teams pt
        ON pt.team_id = ur.context_id
        AND ur.context_type = 'team'::resource_type
      WHERE ur.user_id = p_user_id
        AND pt.project_id = p_resource_id
        AND (pt.unassigned_at IS NULL OR pt.unassigned_at > now())
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
    
    -- (b) via project_role_id override
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.projects_teams pt
        ON pt.team_id = ur.context_id
        AND ur.context_type = 'team'::resource_type
      JOIN public.role_permissions rp
        ON rp.role_id = pt.project_role_id
      WHERE ur.user_id = p_user_id
        AND pt.project_id = p_resource_id
        AND (pt.unassigned_at IS NULL OR pt.unassigned_at > now())
        AND pt.project_role_id IS NOT NULL
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 5) Base inheritance (base → team → project)
  IF p_resource_type = 'project'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.bases_teams bt
        ON bt.base_id = ur.context_id
        AND ur.context_type = 'base'::resource_type
      JOIN public.projects_teams pt ON pt.team_id = bt.team_id
      WHERE ur.user_id = p_user_id
        AND pt.project_id = p_resource_id
        AND (bt.unassigned_at IS NULL OR bt.unassigned_at > now())
        AND (pt.unassigned_at IS NULL OR pt.unassigned_at > now())
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 6) Partner inheritance (partner → project)
  IF p_resource_type = 'project'::resource_type THEN
    IF EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.partner_orgs_projects pop
        ON pop.partner_org_id = ur.context_id
        AND ur.context_type = 'partner'::resource_type
      WHERE ur.user_id = p_user_id
        AND pop.project_id = p_resource_id
        AND (pop.unassigned_at IS NULL OR pop.unassigned_at > now())
        AND rp.resource_type = 'project'::resource_type
        AND rp.permission_key = p_action
        AND rp.is_allowed = true
      LIMIT 1
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;


-- Add comment explaining the SECURITY DEFINER requirement
comment ON function public.has_permission (UUID, permission_key, resource_type, UUID) IS 'Checks if a user has a specific permission. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion when called from within RLS policies.';


-- Grant execute permission to authenticated users
GRANT
EXECUTE ON function public.has_permission (UUID, permission_key, resource_type, UUID) TO authenticated;


GRANT
EXECUTE ON function public.has_permission (UUID, permission_key, resource_type, UUID) TO anon;

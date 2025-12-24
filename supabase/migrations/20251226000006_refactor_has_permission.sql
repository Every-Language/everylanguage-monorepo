-- Refactor has_permission function to remove teams logic and ownership shortcut
-- Uses helper functions for project permission checking
CREATE OR REPLACE FUNCTION public.has_permission (
  p_user_id UUID,
  p_action permission_key,
  p_resource_type resource_type,
  p_resource_id UUID
) returns BOOLEAN language plpgsql stable security definer AS $$
DECLARE
  v_project_id UUID;
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

  -- 2) Check project permissions (for project resources or project child entities)
  IF p_resource_type = 'project'::resource_type THEN
    RETURN public.check_project_permission(p_user_id, p_action, p_resource_id);
  END IF;
  
  -- For project child entities, try to resolve project_id and check project permissions
  -- Note: This only works for resources that have a project_id relationship
  -- For INSERT operations, the calling code should pass the project_id directly
  v_project_id := public.resolve_project_id(p_resource_type::TEXT, p_resource_id);
  
  IF v_project_id IS NOT NULL THEN
    -- For verse_feedback actions, check both verse_feedback and project permissions
    IF p_action::TEXT LIKE 'verse_feedback.%' THEN
      -- Check verse_feedback permission first (direct role on project with verse_feedback permission)
      IF EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND ur.context_type = 'project'
          AND ur.context_id::UUID = v_project_id
          AND rp.resource_type = 'project'::resource_type
          AND rp.permission_key = p_action
          AND rp.is_allowed = true
        LIMIT 1
      ) THEN
        RETURN true;
      END IF;
      
      -- Fall back to project permissions
      CASE p_action::TEXT
        WHEN 'verse_feedback.read' THEN
          RETURN public.check_project_permission(p_user_id, 'project.read'::permission_key, v_project_id);
        WHEN 'verse_feedback.write' THEN
          RETURN public.check_project_permission(p_user_id, 'project.write'::permission_key, v_project_id);
        WHEN 'verse_feedback.delete' THEN
          RETURN public.check_project_permission(p_user_id, 'project.delete'::permission_key, v_project_id);
        ELSE
          RETURN false;
      END CASE;
    ELSIF p_action::TEXT IN ('project.read', 'project.write', 'project.delete') THEN
      -- For other project child entities, map to project permissions
      RETURN public.check_project_permission(p_user_id, p_action, v_project_id);
    END IF;
  END IF;

  -- 3) Check direct role on resource
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.context_type = (p_resource_type::TEXT)
      AND ur.context_id::UUID = p_resource_id
      AND rp.resource_type = p_resource_type
      AND rp.permission_key = p_action
      AND rp.is_allowed = true
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

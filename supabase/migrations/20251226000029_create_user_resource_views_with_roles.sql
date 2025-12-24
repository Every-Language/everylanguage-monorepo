-- Create user resource views with role information
-- Migration: 20251226000029_create_user_resource_views_with_roles.sql
-- This migration creates SECURITY DEFINER views that return user's entities with their roles
-- ============================================================================
-- ============================================================================
-- USER PROJECTS VIEW
-- ============================================================================
-- Returns all projects where the authenticated user has a role, including role information
CREATE OR REPLACE VIEW user_projects
WITH
  (security_invoker = FALSE) AS
SELECT
  p.*,
  ur.role_id,
  r.role_key,
  r.name AS role_name,
  r.resource_type AS role_resource_type
FROM
  public.projects p
  INNER JOIN public.user_roles ur ON ur.project_id = p.id
  INNER JOIN public.roles r ON ur.role_id = r.id
WHERE
  ur.user_id = auth.uid ()
  AND ur.project_id IS NOT NULL;


comment ON view user_projects IS 'Returns all projects where the authenticated user has a role, including role information. Filtered by auth.uid() for security.';


-- ============================================================================
-- USER BASES VIEW
-- ============================================================================
-- Returns all bases where the authenticated user has a role, including role information
CREATE OR REPLACE VIEW user_bases
WITH
  (security_invoker = FALSE) AS
SELECT
  b.*,
  ur.role_id,
  r.role_key,
  r.name AS role_name,
  r.resource_type AS role_resource_type
FROM
  public.bases b
  INNER JOIN public.user_roles ur ON ur.base_id = b.id
  INNER JOIN public.roles r ON ur.role_id = r.id
WHERE
  ur.user_id = auth.uid ()
  AND ur.base_id IS NOT NULL;


comment ON view user_bases IS 'Returns all bases where the authenticated user has a role, including role information. Filtered by auth.uid() for security.';


-- ============================================================================
-- USER PARTNER ORGS VIEW
-- ============================================================================
-- Returns all partner orgs where the authenticated user has a role, including role information
CREATE OR REPLACE VIEW user_partner_orgs
WITH
  (security_invoker = FALSE) AS
SELECT
  po.*,
  ur.role_id,
  r.role_key,
  r.name AS role_name,
  r.resource_type AS role_resource_type
FROM
  public.partner_orgs po
  INNER JOIN public.user_roles ur ON ur.partner_org_id = po.id
  INNER JOIN public.roles r ON ur.role_id = r.id
WHERE
  ur.user_id = auth.uid ()
  AND ur.partner_org_id IS NOT NULL;


comment ON view user_partner_orgs IS 'Returns all partner orgs where the authenticated user has a role, including role information. Filtered by auth.uid() for security.';


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT
SELECT
  ON user_projects TO authenticated;


GRANT
SELECT
  ON user_bases TO authenticated;


GRANT
SELECT
  ON user_partner_orgs TO authenticated;

-- Configure user resource views security
-- Migration: 20251226000031_add_rls_to_user_resource_views.sql
-- Note: Views don't support RLS policies in PostgreSQL. Security is enforced via:
-- 1. WITH (security_invoker = false) - makes views SECURITY DEFINER
-- 2. WHERE clause filtering by auth.uid() inside view definition
-- 3. RLS policies on underlying tables (user_roles, projects, bases, partner_orgs)
-- ============================================================================
-- Ensure views are configured with security_invoker = false (already set in view creation)
-- This ensures views run with SECURITY DEFINER privileges and can access auth.uid()
ALTER VIEW user_projects
SET
  (security_invoker = FALSE);


ALTER VIEW user_bases
SET
  (security_invoker = FALSE);


ALTER VIEW user_partner_orgs
SET
  (security_invoker = FALSE);


-- Views are secure because:
-- - They filter by auth.uid() in the WHERE clause
-- - They use SECURITY DEFINER to bypass RLS on underlying tables
-- - Users can only see rows where ur.user_id = auth.uid()
-- No RLS policies needed on views (not supported by PostgreSQL)

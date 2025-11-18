-- Fix project_updates INSERT RLS policy
-- The policy needs to use project_id directly (not project_updates.project_id) in WITH CHECK clauses
-- Also ensure public schema qualification for the function call
-- ============================================================================
DROP POLICY if EXISTS project_updates_insert ON public.project_updates;


CREATE POLICY project_updates_insert ON public.project_updates FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write'::permission_key,
      'project'::resource_type,
      project_id::UUID
    )
  );


comment ON policy project_updates_insert ON public.project_updates IS 'Users with project.write permission can create updates. Uses project_id directly in WITH CHECK clause with explicit UUID casting.';

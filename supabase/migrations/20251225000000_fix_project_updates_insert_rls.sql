-- Fix project_updates INSERT RLS policy
-- The policy was using project_updates.project_id which doesn't work in WITH CHECK clauses
-- Should use just project_id instead
-- ============================================================================
DROP POLICY if EXISTS project_updates_insert ON public.project_updates;


CREATE POLICY project_updates_insert ON public.project_updates FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'project.write',
      'project',
      project_id -- Fixed: use project_id directly, not project_updates.project_id
    )
  );


comment ON policy project_updates_insert ON public.project_updates IS 'Users with project.write permission can create updates. Fixed to use project_id directly in WITH CHECK clause.';

-- Fix sponsorships RLS policy to remove project_id dependency
-- This migration must run BEFORE dropping the project_id column from sponsorships
-- The policy now only uses the join through sponsorship_allocations to check project permissions
DROP POLICY if EXISTS sponsorships_partner_or_project_read ON public.sponsorships;


CREATE POLICY sponsorships_partner_or_project_read ON public.sponsorships FOR
SELECT
  TO authenticated USING (
    -- Partner org membership via user_roles
    EXISTS (
      SELECT
        1
      FROM
        public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        AND r.resource_type = 'partner'
      WHERE
        ur.user_id = auth.uid ()
        AND ur.context_type = 'partner'
        AND ur.context_id = partner_org_id
    )
    OR
    -- Project permissions via sponsorship_allocations join
    EXISTS (
      SELECT
        1
      FROM
        public.sponsorship_allocations sa
      WHERE
        sa.sponsorship_id = public.sponsorships.id
        AND public.has_permission (
          auth.uid (),
          'contribution.read',
          'project',
          sa.project_id
        )
    )
  );

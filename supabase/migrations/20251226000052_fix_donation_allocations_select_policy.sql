-- Fix donation_allocations SELECT policy to allow creators to read their own rows
-- Migration: 20251226000052_fix_donation_allocations_select_policy.sql
-- 
-- Issue: When inserting with RETURNING, the SELECT policy was blocking the query
-- even though system admins should be able to read all rows. The complex EXISTS
-- subqueries might be causing issues during RETURNING clause evaluation.
--
-- Solution: Add a condition to allow reading rows where created_by = auth.uid()
-- This ensures users can always read rows they just created, which is especially
-- important for INSERT with RETURNING operations.
--
-- ============================================================================
-- UPDATE donation_allocations SELECT POLICY
-- ============================================================================
DROP POLICY if EXISTS donation_allocations_read ON donation_allocations;


CREATE POLICY donation_allocations_read ON donation_allocations FOR
SELECT
  USING (
    -- Creator can always read their own allocations
    created_by = auth.uid ()
    OR
    -- Donation owner can read allocations
    EXISTS (
      SELECT
        1
      FROM
        donations d
      WHERE
        d.id = donation_allocations.donation_id
        AND (
          d.user_id = auth.uid ()
          OR (
            d.partner_org_id IS NOT NULL
            AND has_permission (
              auth.uid (),
              'partner.read'::permission_key,
              'partner'::resource_type,
              d.partner_org_id
            )
          )
        )
    )
    OR
    -- Project members can see allocations to their projects
    (
      project_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'project.read'::permission_key,
        'project'::resource_type,
        project_id
      )
    )
    OR
    -- System admins can read all
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL::UUID
    )
  );

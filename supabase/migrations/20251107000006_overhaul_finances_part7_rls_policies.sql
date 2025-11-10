-- Part 7: Complete Finance System Overhaul - RLS Policies
-- Creates Row Level Security policies for all new finance tables
-- ============================================================================
-- DONATIONS TABLE RLS POLICIES
-- ============================================================================
-- Donations: Users can read their own donations, partner org members can read org's donations, admins can read all
CREATE POLICY donations_read ON donations FOR
SELECT
  USING (
    -- User can read their own donations
    (auth.uid () = user_id)
    OR
    -- Partner org members can read their org's donations (using has_permission)
    (
      partner_org_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
    OR
    -- Admins can read all donations (system.admin permission)
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Donations: Only authenticated users can create donations
CREATE POLICY donations_insert ON donations FOR insert TO authenticated
WITH
  CHECK (
    -- Must be creating for yourself OR for a partner org you belong to
    (auth.uid () = user_id)
    OR (
      partner_org_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
  );


-- Donations: Only admins can update donations (e.g., change status)
CREATE POLICY donations_update ON donations
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- ============================================================================
-- DONATION_ALLOCATIONS TABLE RLS POLICIES
-- ============================================================================
-- Donation Allocations: Readable by donation owner or admins
CREATE POLICY donation_allocations_read ON donation_allocations FOR
SELECT
  USING (
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
    -- Admins can read all allocations
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Donation Allocations: Only admins can create/update/delete
CREATE POLICY donation_allocations_insert ON donation_allocations FOR insert
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY donation_allocations_update ON donation_allocations
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY donation_allocations_delete ON donation_allocations FOR delete USING (
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL
  )
);


-- ============================================================================
-- OPERATIONS TABLE RLS POLICIES
-- ============================================================================
-- Operations: Public read for available operations, all read for authenticated users
CREATE POLICY operations_read ON operations FOR
SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Public can see available operations
      (
        is_public = TRUE
        AND status = 'available'
      )
      OR
      -- Authenticated users can see all non-deleted operations
      auth.uid () IS NOT NULL
    )
  );


-- Operations: Only admins can create/update/delete
CREATE POLICY operations_insert ON operations FOR insert
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY operations_update ON operations
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY operations_delete ON operations FOR delete USING (
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL
  )
);


-- ============================================================================
-- OPERATION_COSTS TABLE RLS POLICIES
-- ============================================================================
-- Operation Costs: Admins and users who have allocated to the operation can read
CREATE POLICY operation_costs_read ON operation_costs FOR
SELECT
  USING (
    -- Admins can read all
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
    OR
    -- Users who have donations allocated to this operation can read costs
    EXISTS (
      SELECT
        1
      FROM
        donation_allocations da
        JOIN donations d ON d.id = da.donation_id
      WHERE
        da.operation_id = operation_costs.operation_id
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
  );


-- Operation Costs: Only admins can create/update/delete
CREATE POLICY operation_costs_insert ON operation_costs FOR insert
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY operation_costs_update ON operation_costs
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


CREATE POLICY operation_costs_delete ON operation_costs FOR delete USING (
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL
  )
);


-- ============================================================================
-- PAYMENT_ATTEMPTS TABLE RLS POLICIES
-- ============================================================================
-- Payment Attempts: Readable by donation owner or admins (sensitive payment info)
CREATE POLICY payment_attempts_read ON payment_attempts FOR
SELECT
  USING (
    -- Donation owner can read payment attempts
    EXISTS (
      SELECT
        1
      FROM
        donations d
      WHERE
        d.id = payment_attempts.donation_id
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
    -- Admins can read all payment attempts
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Payment Attempts: Only system/admins can create (typically via webhooks)
CREATE POLICY payment_attempts_insert ON payment_attempts FOR insert
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- ============================================================================
-- PAYMENT_METHODS TABLE RLS POLICIES
-- ============================================================================
-- Payment Methods: Users can manage their own, partner org members can manage org's
CREATE POLICY payment_methods_read ON payment_methods FOR
SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- User can read their own payment methods
      auth.uid () = user_id
      OR
      -- Partner org members can read their org's payment methods
      (
        partner_org_id IS NOT NULL
        AND has_permission (
          auth.uid (),
          'partner.read'::permission_key,
          'partner'::resource_type,
          partner_org_id
        )
      )
      OR
      -- Admins can read all
      has_permission (
        auth.uid (),
        'system.admin'::permission_key,
        'global'::resource_type,
        NULL
      )
    )
  );


CREATE POLICY payment_methods_insert ON payment_methods FOR insert
WITH
  CHECK (
    -- User creating for themselves OR for a partner org they belong to
    auth.uid () = user_id
    OR (
      partner_org_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
  );


CREATE POLICY payment_methods_update ON payment_methods
FOR UPDATE
  USING (
    -- User updating their own OR partner org member updating org's
    auth.uid () = user_id
    OR (
      partner_org_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
  );


CREATE POLICY payment_methods_delete ON payment_methods FOR delete USING (
  -- Soft delete by updating deleted_at
  auth.uid () = user_id
  OR (
    partner_org_id IS NOT NULL
    AND has_permission (
      auth.uid (),
      'partner.read'::permission_key,
      'partner'::resource_type,
      partner_org_id
    )
  )
);


-- ============================================================================
-- TRANSACTIONS TABLE RLS POLICIES (Updated from contributions)
-- ============================================================================
-- Transactions: Keep existing policies but update for new structure
-- Note: Existing policies were renamed in Part 4, these ensure proper access with new columns
CREATE POLICY transactions_read_v2 ON transactions FOR
SELECT
  USING (
    -- User can read their own transactions
    (auth.uid () = user_id)
    OR
    -- Partner org members can read org transactions
    EXISTS (
      SELECT
        1
      FROM
        donations d
      WHERE
        d.id = transactions.donation_id
        AND d.partner_org_id IS NOT NULL
        AND has_permission (
          auth.uid (),
          'partner.read'::permission_key,
          'partner'::resource_type,
          d.partner_org_id
        )
    )
    OR
    -- Project members can read transactions for their projects
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
    -- Admins can read all transactions
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Transactions: Only system/admins can insert (immutable ledger)
CREATE POLICY transactions_insert_v2 ON transactions FOR insert
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Note: No UPDATE or DELETE policies - transactions are immutable
comment ON policy donations_read ON donations IS 'Users read own donations, partner org members read org donations, admins read all';


comment ON policy donation_allocations_read ON donation_allocations IS 'Donation owners and project members can read allocations';


comment ON policy operations_read ON operations IS 'Public read for available operations, authenticated users see all';


comment ON policy payment_attempts_read ON payment_attempts IS 'Donation owners and admins can read payment attempts';


comment ON policy payment_methods_read ON payment_methods IS 'Users manage own payment methods, org members manage org methods';


comment ON policy transactions_read_v2 ON transactions IS 'Users read own transactions, project members read project transactions, admins read all';

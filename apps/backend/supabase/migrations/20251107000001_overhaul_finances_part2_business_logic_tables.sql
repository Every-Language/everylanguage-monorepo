-- Part 2: Complete Finance System Overhaul - Business Logic Layer Tables
-- Creates core tables for donor commitments, allocations, and operations
-- Enable RLS on all tables
ALTER TABLE IF EXISTS donations enable ROW level security;


ALTER TABLE IF EXISTS donation_allocations enable ROW level security;


ALTER TABLE IF EXISTS operations enable ROW level security;


ALTER TABLE IF EXISTS operation_costs enable ROW level security;


-- operations - Operational funding categories (Business Logic Layer)
-- NOTE: Created first because donations references it
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category operation_category NOT NULL,
  -- Status
  status entity_status NOT NULL DEFAULT 'draft',
  -- Display
  display_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  -- Audit trail
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);


-- Indexes for operations
CREATE UNIQUE INDEX if NOT EXISTS idx_operations_name_active ON operations (name)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_operations_status ON operations (status)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_operations_category ON operations (category)
WHERE
  deleted_at IS NULL;


-- Comments
comment ON TABLE operations IS 'Business logic layer: operational funding categories (travel, legal, servers, etc.)';


comment ON COLUMN operations.status IS 'Funding status: draft (hidden), available (accepting donations), funded (goal met), archived (closed)';


comment ON COLUMN operations.is_public IS 'Whether this operation is visible to donors in donation flow';


-- donations - Central table for all donor commitments (Business Logic Layer)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Donor (either user OR partner_org, not both)
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  partner_org_id UUID REFERENCES partner_orgs (id) ON DELETE SET NULL,
  -- Donation intent (what donor wants to fund)
  intent_type donation_intent_type NOT NULL,
  intent_language_entity_id UUID REFERENCES language_entities (id) ON DELETE SET NULL,
  intent_region_id UUID REFERENCES regions (id) ON DELETE SET NULL,
  intent_operation_id UUID REFERENCES operations (id) ON DELETE SET NULL,
  -- Amount & currency
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  -- Status (business layer)
  status donation_status NOT NULL DEFAULT 'draft',
  -- Payment details
  payment_method payment_method_type NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  -- Stripe references (link to provider layer)
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  -- Audit trail
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  -- Constraints
  CONSTRAINT donations_donor_check CHECK (
    (
      user_id IS NOT NULL
      AND partner_org_id IS NULL
    )
    OR (
      user_id IS NULL
      AND partner_org_id IS NOT NULL
    )
  ),
  CONSTRAINT donations_intent_check CHECK (
    (
      intent_type = 'language'
      AND intent_language_entity_id IS NOT NULL
    )
    OR (
      intent_type = 'region'
      AND intent_region_id IS NOT NULL
    )
    OR (
      intent_type = 'operation'
      AND intent_operation_id IS NOT NULL
    )
    OR (intent_type = 'unrestricted')
  )
);


-- Indexes for donations
CREATE INDEX if NOT EXISTS idx_donations_user ON donations (user_id)
WHERE
  user_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_donations_partner_org ON donations (partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_donations_status ON donations (status)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_donations_stripe_customer ON donations (stripe_customer_id);


CREATE INDEX if NOT EXISTS idx_donations_stripe_pi ON donations (stripe_payment_intent_id)
WHERE
  stripe_payment_intent_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_donations_stripe_sub ON donations (stripe_subscription_id)
WHERE
  stripe_subscription_id IS NOT NULL;


-- Comments
comment ON TABLE donations IS 'Business logic layer: donor commitments and intent for what they want to fund';


comment ON COLUMN donations.intent_type IS 'What the donor wants to fund: specific language, region, operation, or unrestricted';


comment ON COLUMN donations.user_id IS 'Individual donor (mutually exclusive with partner_org_id)';


comment ON COLUMN donations.partner_org_id IS 'Organization donor (mutually exclusive with user_id)';


comment ON COLUMN donations.status IS 'Business layer status: draft, pending, processing, completed, failed, refunded, cancelled';


-- donation_allocations - How donations are deployed to projects/operations (Business Logic Layer)
CREATE TABLE IF NOT EXISTS donation_allocations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Parent donation
  donation_id UUID NOT NULL REFERENCES donations (id) ON DELETE CASCADE,
  -- Allocation target (either project OR operation, not both)
  project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations (id) ON DELETE CASCADE,
  -- Allocation amount
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  -- Effective date range
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date,
  -- Audit trail
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  -- Constraints
  CONSTRAINT donation_allocations_target_check CHECK (
    (
      project_id IS NOT NULL
      AND operation_id IS NULL
    )
    OR (
      project_id IS NULL
      AND operation_id IS NOT NULL
    )
  ),
  CONSTRAINT donation_allocations_effective_dates CHECK (
    effective_to IS NULL
    OR effective_to >= effective_from
  )
);


-- Indexes for donation_allocations
CREATE INDEX if NOT EXISTS idx_donation_allocations_donation ON donation_allocations (donation_id);


CREATE INDEX if NOT EXISTS idx_donation_allocations_project ON donation_allocations (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_donation_allocations_operation ON donation_allocations (operation_id)
WHERE
  operation_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_donation_allocations_effective ON donation_allocations (effective_from, effective_to);


-- Comments
comment ON TABLE donation_allocations IS 'Business logic layer: how donations are allocated to specific projects or operations by admins';


comment ON COLUMN donation_allocations.effective_from IS 'Date when this allocation becomes active';


comment ON COLUMN donation_allocations.effective_to IS 'Optional end date for allocation (NULL = ongoing)';


-- operation_costs - Line items for operational expenses
CREATE TABLE IF NOT EXISTS operation_costs (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Parent operation
  operation_id UUID NOT NULL REFERENCES operations (id) ON DELETE CASCADE,
  -- Cost details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Description
  category operation_category NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  -- Audit trail
  created_by UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);


-- Indexes for operation_costs
CREATE INDEX if NOT EXISTS idx_operation_costs_operation ON operation_costs (operation_id);


CREATE INDEX if NOT EXISTS idx_operation_costs_occurred ON operation_costs (occurred_at DESC);


CREATE INDEX if NOT EXISTS idx_operation_costs_category ON operation_costs (category);


-- Comments
comment ON TABLE operation_costs IS 'Line items for operational expenses tracked against operations';


comment ON COLUMN operation_costs.receipt_url IS 'Optional URL to receipt/invoice document';


comment ON COLUMN operation_costs.occurred_at IS 'When the expense occurred (not when it was recorded)';

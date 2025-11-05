-- Migration: Refactor Sponsorships to Project Balance-Based Billing
-- Date: 2024-11-04
-- Description: Major architectural refactor to separate language adoption sponsorships
-- from operational donations, implement project balance billing, and support flexible payments
-- ============================================================================
-- SECTION 1: Drop Old Tables and Views
-- ============================================================================
-- Drop views that depend on old schema
DROP VIEW if EXISTS vw_partner_org_active_projects cascade;


DROP VIEW if EXISTS vw_partner_org_pending_languages cascade;


DROP VIEW if EXISTS vw_partner_org_language_entities cascade;


-- Drop old tables (in order of dependencies)
DROP TABLE IF EXISTS project_budget_items cascade;


DROP TABLE IF EXISTS project_budgets cascade;


DROP TABLE IF EXISTS project_financials cascade;


DROP TABLE IF EXISTS sponsorship_allocations cascade;


DROP TABLE IF EXISTS sponsorships cascade;


-- ============================================================================
-- SECTION 2: Rename Existing Table
-- ============================================================================
-- Rename project_budget_actual_costs to project_budget_costs
ALTER TABLE IF EXISTS project_budget_actual_costs
RENAME TO project_budget_costs;


-- ============================================================================
-- SECTION 3: Update Enums
-- ============================================================================
-- Update adoption_status enum
-- Cannot directly rename enum value, so we need to handle existing data differently
-- Add new status values
DO $$
BEGIN
  -- Add 'active' status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'active' AND enumtypid = 'adoption_status'::regtype) THEN
    ALTER TYPE adoption_status ADD VALUE 'active';
  END IF;
  
  -- Add 'deposit_paid' status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deposit_paid' AND enumtypid = 'adoption_status'::regtype) THEN
    ALTER TYPE adoption_status ADD VALUE 'deposit_paid';
  END IF;
  
  -- Add 'fully_funded' status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fully_funded' AND enumtypid = 'adoption_status'::regtype) THEN
    ALTER TYPE adoption_status ADD VALUE 'fully_funded';
  END IF;
END $$;


-- Migrate existing 'on_hold' to 'deposit_paid'
UPDATE language_adoptions
SET
  status = 'deposit_paid'
WHERE
  status = 'on_hold';


-- Remove bank_transfer_expiry_at since we're using Stripe's automatic expiry
ALTER TABLE language_adoptions
DROP COLUMN IF EXISTS bank_transfer_expiry_at;


-- Update contribution_kind enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'initial_deposit' AND enumtypid = 'contribution_kind'::regtype) THEN
    ALTER TYPE contribution_kind ADD VALUE 'initial_deposit';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manual_top_up' AND enumtypid = 'contribution_kind'::regtype) THEN
    ALTER TYPE contribution_kind ADD VALUE 'manual_top_up';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription_top_up' AND enumtypid = 'contribution_kind'::regtype) THEN
    ALTER TYPE contribution_kind ADD VALUE 'subscription_top_up';
  END IF;
END $$;


-- ============================================================================
-- SECTION 4: Create New Enum Types
-- ============================================================================
-- Create subscription_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
    CREATE TYPE subscription_type AS ENUM ('operational', 'project_top_up');
  END IF;
END $$;


-- ============================================================================
-- SECTION 5: Create New Tables
-- ============================================================================
-- 5.1: language_adoption_sponsorships
CREATE TABLE IF NOT EXISTS public.language_adoption_sponsorships (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  partner_org_id UUID NOT NULL REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  language_adoption_id UUID NOT NULL REFERENCES public.language_adoptions (id) ON DELETE CASCADE,
  -- Deposit amount (calculated from language_adoption.estimated_budget * deposit_percent)
  deposit_amount_cents INTEGER NOT NULL CHECK (deposit_amount_cents >= 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  -- Payment tracking
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'bank_transfer')),
  deposit_paid_at TIMESTAMPTZ NULL,
  -- Stripe IDs
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT NULL,
  stripe_setup_intent_id TEXT NULL, -- For saving card for future payments
  -- Metadata
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL,
  UNIQUE (partner_org_id, language_adoption_id)
);


comment ON TABLE language_adoption_sponsorships IS 'Language adoption sponsorships with initial deposit tracking';


comment ON COLUMN language_adoption_sponsorships.deposit_amount_cents IS 'Initial deposit amount (typically 20% of estimated budget)';


comment ON COLUMN language_adoption_sponsorships.stripe_setup_intent_id IS 'SetupIntent ID for saving payment method for future project top-ups';


-- Indexes for language_adoption_sponsorships
CREATE INDEX idx_lang_adoption_sponsorships_partner ON language_adoption_sponsorships (partner_org_id);


CREATE INDEX idx_lang_adoption_sponsorships_adoption ON language_adoption_sponsorships (language_adoption_id);


CREATE INDEX idx_lang_adoption_sponsorships_stripe_customer ON language_adoption_sponsorships (stripe_customer_id);


-- 5.2: language_adoption_sponsorship_allocations
CREATE TABLE IF NOT EXISTS public.language_adoption_sponsorship_allocations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_adoption_sponsorship_id UUID NOT NULL REFERENCES public.language_adoption_sponsorships (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  -- Allocation details
  allocation_percent NUMERIC NOT NULL CHECK (
    allocation_percent >= 0
    AND allocation_percent <= 1
  ),
  is_primary_sponsor BOOLEAN NOT NULL DEFAULT FALSE,
  -- Effective dates
  effective_from date NOT NULL DEFAULT current_date,
  effective_to date NULL,
  -- Metadata
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


comment ON TABLE language_adoption_sponsorship_allocations IS 'Maps language adoption sponsorships to projects with allocation percentages';


comment ON COLUMN language_adoption_sponsorship_allocations.allocation_percent IS 'Percentage of deposit and future contributions allocated to this project (0.0 to 1.0)';


comment ON COLUMN language_adoption_sponsorship_allocations.is_primary_sponsor IS 'Designates the primary sponsor responsible for project billing';


-- Indexes for language_adoption_sponsorship_allocations
CREATE INDEX idx_lang_adoption_alloc_sponsorship ON language_adoption_sponsorship_allocations (language_adoption_sponsorship_id);


CREATE INDEX idx_lang_adoption_alloc_project ON language_adoption_sponsorship_allocations (project_id);


CREATE INDEX idx_lang_adoption_alloc_effective ON language_adoption_sponsorship_allocations (effective_from, effective_to);


-- 5.3: subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Links to user (for operational) or partner org (for project top-ups)
  user_id UUID NULL REFERENCES public.users (id) ON DELETE CASCADE,
  partner_org_id UUID NULL REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  -- Type and associations
  subscription_type subscription_type NOT NULL,
  project_id UUID NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  language_adoption_sponsorship_id UUID NULL REFERENCES public.language_adoption_sponsorships (id) ON DELETE CASCADE,
  -- Subscription details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'cancelled', 'expired')
  ),
  -- Stripe details
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NULL,
  -- Lifecycle
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL,
  -- Constraints: operational = user_id only, project = partner_org_id only
  CONSTRAINT check_subscription_associations CHECK (
    (
      subscription_type = 'operational'
      AND user_id IS NOT NULL
      AND partner_org_id IS NULL
      AND project_id IS NULL
    )
    OR (
      subscription_type = 'project_top_up'
      AND partner_org_id IS NOT NULL
      AND user_id IS NULL
      AND project_id IS NOT NULL
    )
  )
);


comment ON TABLE subscriptions IS 'Recurring subscriptions for operational donations or project balance top-ups';


comment ON COLUMN subscriptions.subscription_type IS 'Type of subscription: operational (general support) or project_top_up (specific project funding)';


-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions (user_id)
WHERE
  user_id IS NOT NULL;


CREATE INDEX idx_subscriptions_partner ON subscriptions (partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


CREATE INDEX idx_subscriptions_project ON subscriptions (project_id)
WHERE
  project_id IS NOT NULL;


CREATE INDEX idx_subscriptions_stripe ON subscriptions (stripe_subscription_id);


CREATE INDEX idx_subscriptions_status ON subscriptions (status)
WHERE
  status = 'active';


-- ============================================================================
-- SECTION 6: Update contributions Table
-- ============================================================================
-- Add new columns to contributions
ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS language_adoption_sponsorship_id UUID REFERENCES language_adoption_sponsorships (id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users (id) ON DELETE SET NULL;


comment ON COLUMN contributions.language_adoption_sponsorship_id IS 'Link to language adoption sponsorship for initial deposits and project contributions';


comment ON COLUMN contributions.subscription_id IS 'Link to subscription record for recurring subscription payments';


comment ON COLUMN contributions.user_id IS 'Link to user for operational donations (alternative to sponsorship_id)';


-- Add indexes for new columns
CREATE INDEX idx_contributions_lang_adoption_sponsorship ON contributions (language_adoption_sponsorship_id)
WHERE
  language_adoption_sponsorship_id IS NOT NULL;


CREATE INDEX idx_contributions_subscription ON contributions (subscription_id)
WHERE
  subscription_id IS NOT NULL;


CREATE INDEX idx_contributions_user ON contributions (user_id)
WHERE
  user_id IS NOT NULL;


-- ============================================================================
-- SECTION 7: Create Trigger for Deposit Allocation
-- ============================================================================
-- Function to allocate deposit to projects when allocation is created
CREATE OR REPLACE FUNCTION allocate_deposit_to_projects () returns trigger AS $$
DECLARE
  deposit_contribution RECORD;
  allocated_amount INTEGER;
  existing_allocations INTEGER;
BEGIN
  -- Find the initial deposit contribution for this sponsorship
  SELECT * INTO deposit_contribution
  FROM contributions
  WHERE language_adoption_sponsorship_id = NEW.language_adoption_sponsorship_id
    AND kind = 'initial_deposit'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- No deposit to allocate yet, return early
    RETURN NEW;
  END IF;
  
  -- Calculate allocated amount based on percentage
  allocated_amount := FLOOR(deposit_contribution.amount_cents * NEW.allocation_percent);
  
  -- Count existing allocations for this sponsorship that have been processed
  SELECT COUNT(*) INTO existing_allocations
  FROM contributions c
  JOIN language_adoption_sponsorship_allocations lasa 
    ON c.project_id = lasa.project_id
  WHERE c.language_adoption_sponsorship_id = NEW.language_adoption_sponsorship_id
    AND c.kind = 'initial_deposit'
    AND lasa.language_adoption_sponsorship_id = NEW.language_adoption_sponsorship_id;
  
  IF existing_allocations = 0 THEN
    -- First allocation: update existing contribution
    UPDATE contributions
    SET project_id = NEW.project_id,
        amount_cents = allocated_amount
    WHERE id = deposit_contribution.id;
  ELSE
    -- Additional allocation (split): create new contribution record
    INSERT INTO contributions (
      language_adoption_sponsorship_id,
      project_id,
      language_adoption_id,
      amount_cents,
      currency_code,
      occurred_at,
      kind,
      stripe_payment_intent_id,
      stripe_charge_id,
      created_at
    ) VALUES (
      NEW.language_adoption_sponsorship_id,
      NEW.project_id,
      deposit_contribution.language_adoption_id,
      allocated_amount,
      deposit_contribution.currency_code,
      deposit_contribution.occurred_at,
      'initial_deposit',
      deposit_contribution.stripe_payment_intent_id,
      deposit_contribution.stripe_charge_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


comment ON function allocate_deposit_to_projects IS 'Automatically allocates deposit contributions to projects when sponsorship allocation is created';


-- Create trigger
DROP TRIGGER if EXISTS trigger_allocate_deposit ON language_adoption_sponsorship_allocations;


CREATE TRIGGER trigger_allocate_deposit
AFTER insert ON language_adoption_sponsorship_allocations FOR each ROW
EXECUTE function allocate_deposit_to_projects ();


-- ============================================================================
-- SECTION 8: Create Views
-- ============================================================================
-- 8.1: Project Balance View
CREATE OR REPLACE VIEW vw_project_balances AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.status AS project_status,
  p.target_language_entity_id AS language_entity_id,
  COALESCE(SUM(c.amount_cents), 0) AS total_contributions_cents,
  COALESCE(SUM(costs.amount_cents), 0) AS total_costs_cents,
  COALESCE(SUM(c.amount_cents), 0) - COALESCE(SUM(costs.amount_cents), 0) AS balance_cents,
  p.currency_code,
  COUNT(DISTINCT c.id) AS contribution_count,
  COUNT(DISTINCT costs.id) AS cost_count,
  MAX(c.occurred_at) AS last_contribution_at,
  MAX(costs.incurred_date) AS last_cost_at
FROM
  projects p
  LEFT JOIN contributions c ON c.project_id = p.id
  LEFT JOIN project_budget_costs costs ON costs.project_id = p.id
WHERE
  p.status IN ('precreated', 'active', 'completed')
GROUP BY
  p.id,
  p.name,
  p.status,
  p.target_language_entity_id,
  p.currency_code;


comment ON view vw_project_balances IS 'Real-time project balance calculation: total contributions - total costs';


-- 8.2: Partner Org Active Projects View
CREATE OR REPLACE VIEW vw_partner_org_active_projects AS
SELECT DISTINCT
  las.id AS sponsorship_id,
  las.partner_org_id,
  las.language_adoption_id,
  lasa.project_id,
  p.name AS project_name,
  p.description AS project_description,
  p.status AS project_status,
  p.target_language_entity_id AS language_entity_id,
  le.name AS language_name,
  lasa.allocation_percent,
  lasa.is_primary_sponsor,
  lasa.effective_from,
  lasa.effective_to,
  pb.balance_cents AS project_balance_cents,
  pb.total_contributions_cents,
  pb.total_costs_cents,
  las.deposit_amount_cents,
  las.deposit_paid_at,
  las.payment_method
FROM
  language_adoption_sponsorships las
  JOIN language_adoption_sponsorship_allocations lasa ON lasa.language_adoption_sponsorship_id = las.id
  JOIN projects p ON p.id = lasa.project_id
  JOIN language_entities le ON le.id = p.target_language_entity_id
  LEFT JOIN vw_project_balances pb ON pb.project_id = p.id
WHERE
  las.deposit_paid_at IS NOT NULL
  AND (
    lasa.effective_to IS NULL
    OR lasa.effective_to >= current_date
  );


comment ON view vw_partner_org_active_projects IS 'Active projects for partner orgs with allocated language adoption sponsorships';


-- 8.3: Partner Org Pending Languages View
CREATE OR REPLACE VIEW vw_partner_org_pending_languages AS
SELECT DISTINCT
  las.id AS sponsorship_id,
  las.partner_org_id,
  la.id AS language_adoption_id,
  la.language_entity_id,
  le.name AS language_name,
  la.estimated_budget_cents,
  la.currency_code,
  la.status AS adoption_status,
  las.deposit_amount_cents,
  las.deposit_paid_at,
  las.payment_method,
  las.created_at AS sponsorship_created_at
FROM
  language_adoption_sponsorships las
  JOIN language_adoptions la ON la.id = las.language_adoption_id
  JOIN language_entities le ON le.id = la.language_entity_id
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      language_adoption_sponsorship_allocations lasa
    WHERE
      lasa.language_adoption_sponsorship_id = las.id
      AND (
        lasa.effective_to IS NULL
        OR lasa.effective_to >= current_date
      )
  );


comment ON view vw_partner_org_pending_languages IS 'Language adoption sponsorships that have been paid but not yet allocated to projects';


-- 8.4: Partner Org Language Entities View
CREATE OR REPLACE VIEW vw_partner_org_language_entities AS
SELECT DISTINCT
  las.partner_org_id,
  p.target_language_entity_id AS language_entity_id,
  p.id AS project_id,
  le.name AS language_name,
  lasa.is_primary_sponsor
FROM
  language_adoption_sponsorships las
  JOIN language_adoption_sponsorship_allocations lasa ON lasa.language_adoption_sponsorship_id = las.id
  JOIN projects p ON p.id = lasa.project_id
  JOIN language_entities le ON le.id = p.target_language_entity_id
WHERE
  las.deposit_paid_at IS NOT NULL
  AND (
    lasa.effective_to IS NULL
    OR lasa.effective_to >= current_date
  );


comment ON view vw_partner_org_language_entities IS 'Maps partner orgs to language entities through active project allocations';


-- ============================================================================
-- SECTION 9: Row Level Security Policies
-- ============================================================================
-- Enable RLS on new tables
ALTER TABLE language_adoption_sponsorships enable ROW level security;


ALTER TABLE language_adoption_sponsorship_allocations enable ROW level security;


ALTER TABLE subscriptions enable ROW level security;


-- RLS Policies for language_adoption_sponsorships
CREATE POLICY language_adoption_sponsorships_read ON language_adoption_sponsorships FOR
SELECT
  TO authenticated USING (
    public.has_permission (
      auth.uid (),
      'contribution.read',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY language_adoption_sponsorships_write ON language_adoption_sponsorships FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY language_adoption_sponsorships_update ON language_adoption_sponsorships
FOR UPDATE
  TO authenticated USING (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- RLS Policies for language_adoption_sponsorship_allocations
CREATE POLICY language_adoption_alloc_read ON language_adoption_sponsorship_allocations FOR
SELECT
  TO authenticated USING (
    EXISTS (
      SELECT
        1
      FROM
        language_adoption_sponsorships las
      WHERE
        las.id = language_adoption_sponsorship_id
        AND (
          public.has_permission (
            auth.uid (),
            'contribution.read',
            'partner',
            las.partner_org_id
          )
          OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
        )
    )
  );


CREATE POLICY language_adoption_alloc_write ON language_adoption_sponsorship_allocations FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY language_adoption_alloc_update ON language_adoption_sponsorship_allocations
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- RLS Policies for subscriptions
CREATE POLICY subscriptions_read ON subscriptions FOR
SELECT
  TO authenticated USING (
    user_id = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'contribution.read',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY subscriptions_write ON subscriptions FOR insert TO authenticated
WITH
  CHECK (
    user_id = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY subscriptions_update ON subscriptions
FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    user_id = auth.uid ()
    OR public.has_permission (
      auth.uid (),
      'contribution.write',
      'partner',
      partner_org_id
    )
    OR public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ============================================================================
-- SECTION 10: Cleanup Comments
-- ============================================================================
-- Add helpful comments for developers
comment ON COLUMN language_adoptions.status IS 'Lifecycle: draft → available → deposit_paid → active → fully_funded/archived';


-- Migration complete
-- Note: Run data migration script separately to migrate existing sponsorship data

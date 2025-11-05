-- Part 3: Complete Finance System Overhaul - Payment Provider Layer Tables
-- Creates tables for Stripe payment tracking and saved payment methods
-- Enable RLS on all tables
ALTER TABLE IF EXISTS payment_attempts enable ROW level security;


ALTER TABLE IF EXISTS payment_methods enable ROW level security;


-- payment_attempts - Complete Stripe transaction audit trail (Payment Provider Layer)
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Link to business layer
  donation_id UUID NOT NULL REFERENCES donations (id) ON DELETE CASCADE,
  -- Stripe details
  stripe_payment_intent_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_event_id TEXT, -- For idempotency
  -- Payment status (mirrors Stripe status)
  status payment_attempt_status NOT NULL,
  -- Amount
  amount_cents INTEGER NOT NULL,
  amount_received_cents INTEGER, -- Actual amount after fees
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  -- Error handling
  failure_code TEXT,
  failure_message TEXT,
  -- Metadata
  metadata JSONB
);


-- Indexes for payment_attempts
CREATE UNIQUE INDEX if NOT EXISTS idx_payment_attempts_stripe_pi ON payment_attempts (stripe_payment_intent_id);


CREATE UNIQUE INDEX if NOT EXISTS idx_payment_attempts_stripe_event ON payment_attempts (stripe_event_id)
WHERE
  stripe_event_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_payment_attempts_donation ON payment_attempts (donation_id);


CREATE INDEX if NOT EXISTS idx_payment_attempts_status ON payment_attempts (status);


CREATE INDEX if NOT EXISTS idx_payment_attempts_created ON payment_attempts (created_at DESC);


-- Comments
comment ON TABLE payment_attempts IS 'Payment provider layer: complete audit trail of all Stripe payment attempts and their outcomes';


comment ON COLUMN payment_attempts.stripe_event_id IS 'Stripe webhook event ID for idempotency - prevents duplicate processing of same event';


comment ON COLUMN payment_attempts.status IS 'Mirrors Stripe PaymentIntent status: requires_payment_method, requires_confirmation, processing, succeeded, failed, etc.';


comment ON COLUMN payment_attempts.amount_cents IS 'Amount attempted to charge';


comment ON COLUMN payment_attempts.amount_received_cents IS 'Actual amount received after Stripe fees (available after success)';


-- payment_methods - Saved customer payment methods (Payment Provider Layer)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Owner (either user OR partner_org, not both)
  user_id UUID REFERENCES users (id) ON DELETE CASCADE,
  partner_org_id UUID REFERENCES partner_orgs (id) ON DELETE CASCADE,
  -- Stripe details
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  -- Payment method details
  type payment_method_type NOT NULL,
  -- Card details (if type = 'card')
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  -- Bank account details (if type = 'us_bank_account')
  bank_name TEXT,
  bank_last4 TEXT,
  -- Billing address (JSONB for flexibility)
  billing_address JSONB,
  -- Status
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  -- Constraints
  CONSTRAINT payment_methods_owner_check CHECK (
    (
      user_id IS NOT NULL
      AND partner_org_id IS NULL
    )
    OR (
      user_id IS NULL
      AND partner_org_id IS NOT NULL
    )
  ),
  CONSTRAINT payment_methods_card_details_check CHECK (
    type != 'card'
    OR (
      card_last4 IS NOT NULL
      AND card_exp_month IS NOT NULL
      AND card_exp_year IS NOT NULL
    )
  ),
  CONSTRAINT payment_methods_bank_details_check CHECK (
    type NOT IN ('us_bank_account', 'sepa_debit')
    OR bank_last4 IS NOT NULL
  )
);


-- Indexes for payment_methods
CREATE INDEX if NOT EXISTS idx_payment_methods_user ON payment_methods (user_id)
WHERE
  user_id IS NOT NULL
  AND deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_payment_methods_partner_org ON payment_methods (partner_org_id)
WHERE
  partner_org_id IS NOT NULL
  AND deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_payment_methods_stripe_customer ON payment_methods (stripe_customer_id)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_payment_methods_is_default ON payment_methods (user_id, partner_org_id, is_default)
WHERE
  is_default = TRUE
  AND deleted_at IS NULL;


-- Comments
comment ON TABLE payment_methods IS 'Payment provider layer: saved customer payment methods from Stripe for future recurring payments';


comment ON COLUMN payment_methods.stripe_payment_method_id IS 'Stripe PaymentMethod ID (pm_xxx)';


comment ON COLUMN payment_methods.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) that owns this payment method';


comment ON COLUMN payment_methods.billing_address IS 'JSONB structure: {line1, line2, city, state, postal_code, country}';


comment ON COLUMN payment_methods.is_default IS 'Whether this is the default payment method for the user/organization';

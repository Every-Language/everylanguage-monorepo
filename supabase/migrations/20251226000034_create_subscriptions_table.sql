-- Create subscriptions table and add subscription_id to donations
-- Payment Provider Layer: Track Stripe subscriptions for recurring donations
-- ============================================================================
-- PART 1: CREATE SUBSCRIPTION STATUS ENUM
-- ============================================================================
-- Create subscription status enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'active',
      'canceled',
      'past_due',
      'unpaid',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'paused'
    );
  END IF;
END $$;


-- ============================================================================
-- PART 2: CREATE SUBSCRIPTIONS TABLE (Payment Provider Layer)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  -- Stripe subscription details (Payment Provider Layer)
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  -- Link to original donation that created this subscription
  original_donation_id UUID REFERENCES donations (id) ON DELETE SET NULL,
  -- Subscription amount and frequency
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  interval_type TEXT NOT NULL CHECK (interval_type IN ('month', 'year')),
  -- Subscription status
  status subscription_status NOT NULL DEFAULT 'incomplete',
  -- Current billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  -- Donation intent (copied from original donation for recurring donations)
  intent_type donation_intent_type NOT NULL,
  intent_language_entity_id UUID REFERENCES language_entities (id) ON DELETE SET NULL,
  intent_region_id UUID REFERENCES regions (id) ON DELETE SET NULL,
  intent_operation_id UUID REFERENCES operations (id) ON DELETE SET NULL,
  -- Donor (either user OR partner_org, not both)
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  partner_org_id UUID REFERENCES partner_orgs (id) ON DELETE SET NULL,
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  -- Constraints
  CONSTRAINT subscriptions_donor_check CHECK (
    (
      user_id IS NOT NULL
      AND partner_org_id IS NULL
    )
    OR (
      user_id IS NULL
      AND partner_org_id IS NOT NULL
    )
  ),
  CONSTRAINT subscriptions_intent_check CHECK (
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


-- ============================================================================
-- PART 3: CREATE INDEXES FOR SUBSCRIPTIONS
-- ============================================================================
CREATE UNIQUE INDEX if NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions (stripe_subscription_id);


CREATE INDEX if NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);


CREATE INDEX if NOT EXISTS idx_subscriptions_user ON subscriptions (user_id)
WHERE
  user_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_subscriptions_partner_org ON subscriptions (partner_org_id)
WHERE
  partner_org_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_subscriptions_status ON subscriptions (status)
WHERE
  status IN ('active', 'past_due', 'unpaid');


CREATE INDEX if NOT EXISTS idx_subscriptions_original_donation ON subscriptions (original_donation_id)
WHERE
  original_donation_id IS NOT NULL;


-- ============================================================================
-- PART 4: ADD subscription_id TO DONATIONS TABLE
-- ============================================================================
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions (id) ON DELETE SET NULL;


CREATE INDEX if NOT EXISTS idx_donations_subscription_id ON donations (subscription_id)
WHERE
  subscription_id IS NOT NULL;


-- ============================================================================
-- PART 5: ENABLE RLS ON SUBSCRIPTIONS TABLE
-- ============================================================================
ALTER TABLE subscriptions enable ROW level security;


-- ============================================================================
-- PART 6: CREATE RLS POLICIES FOR SUBSCRIPTIONS
-- ============================================================================
-- SELECT: Users can read their own subscriptions, partner org members can read org subscriptions, system admins can read all
CREATE POLICY subscriptions_read ON subscriptions FOR
SELECT
  USING (
    -- User can read their own subscriptions
    (auth.uid () = user_id)
    OR
    -- Partner org members can read their org's subscriptions
    (
      partner_org_id IS NOT NULL
      AND has_permission (
        auth.uid (),
        'partner.read'::permission_key,
        'partner'::resource_type,
        partner_org_id
      )
    )
  );


-- INSERT: Edge functions only (service role bypasses RLS)
-- No INSERT policy needed - edge functions use service role key
-- UPDATE: Edge functions only (webhook updates)
-- No UPDATE policy needed - edge functions use service role key
-- DELETE: Edge functions only
-- ============================================================================
-- PART 7: ADD COMMENTS
-- ============================================================================
comment ON TABLE subscriptions IS 'Payment provider layer: Stripe subscriptions for recurring donations. Links to original donation and tracks subscription status and billing periods.';


comment ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx) - unique identifier from Stripe';


comment ON COLUMN subscriptions.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) - links to Stripe customer';


comment ON COLUMN subscriptions.original_donation_id IS 'The initial donation that created this subscription';


comment ON COLUMN subscriptions.amount_cents IS 'Recurring donation amount in cents';


comment ON COLUMN subscriptions.interval_type IS 'Billing interval: month or year';


comment ON COLUMN subscriptions.status IS 'Subscription status from Stripe: active, canceled, past_due, unpaid, incomplete, etc.';


comment ON COLUMN subscriptions.current_period_start IS 'Start of current billing period';


comment ON COLUMN subscriptions.current_period_end IS 'End of current billing period (next billing date)';


comment ON COLUMN subscriptions.intent_type IS 'Donation intent copied from original donation (what donor wants to fund)';


comment ON COLUMN donations.subscription_id IS 'Link to subscription for recurring donations. NULL for one-time donations.';

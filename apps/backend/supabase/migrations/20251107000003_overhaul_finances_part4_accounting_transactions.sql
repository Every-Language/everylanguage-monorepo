-- Part 4: Complete Finance System Overhaul - Accounting Layer
-- Renames contributions to transactions and updates structure for new finance system
-- Rename the table from contributions to transactions
ALTER TABLE IF EXISTS contributions
RENAME TO transactions;


-- Drop old foreign keys that are no longer relevant
ALTER TABLE transactions
DROP COLUMN IF EXISTS language_adoption_sponsorship_id cascade;


ALTER TABLE transactions
DROP COLUMN IF EXISTS language_adoption_id cascade;


ALTER TABLE transactions
DROP COLUMN IF EXISTS subscription_id cascade;


-- Add new foreign keys linking to proper layers
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES donations (id) ON DELETE CASCADE;


ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS donation_allocation_id UUID REFERENCES donation_allocations (id) ON DELETE SET NULL;


ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS payment_attempt_id UUID REFERENCES payment_attempts (id) ON DELETE SET NULL;


-- Ensure user_id exists (for tracking who made the transaction)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users (id) ON DELETE SET NULL;


-- Add stripe_event_id for idempotency (prevents duplicate webhook processing)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;


-- Rename and update kind enum
-- First create the new column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS kind_new transaction_kind;


-- Migrate existing values (map old values to new)
UPDATE transactions
SET
  kind_new = CASE
    WHEN kind::TEXT IN (
      'one_time',
      'initial_deposit',
      'manual_top_up',
      'subscription',
      'subscription_top_up'
    ) THEN 'payment'::transaction_kind
    WHEN kind::TEXT = 'refund' THEN 'refund'::transaction_kind
    WHEN kind::TEXT = 'adjustment' THEN 'adjustment'::transaction_kind
    ELSE 'payment'::transaction_kind
  END
WHERE
  kind_new IS NULL;


-- Drop the old kind column and rename new one
ALTER TABLE transactions
DROP COLUMN IF EXISTS kind;


ALTER TABLE transactions
RENAME COLUMN kind_new TO kind;


ALTER TABLE transactions
ALTER COLUMN kind
SET NOT NULL;


-- Create indexes for new columns
CREATE UNIQUE INDEX if NOT EXISTS idx_transactions_stripe_event ON transactions (stripe_event_id)
WHERE
  stripe_event_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_transactions_donation ON transactions (donation_id)
WHERE
  donation_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_transactions_donation_allocation ON transactions (donation_allocation_id)
WHERE
  donation_allocation_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_transactions_payment_attempt ON transactions (payment_attempt_id)
WHERE
  payment_attempt_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_transactions_user ON transactions (user_id)
WHERE
  user_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_transactions_kind ON transactions (kind);


-- Rename RLS policies (if they exist)
DO $$
BEGIN
  -- Check and rename read policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'contributions_read'
  ) THEN
    ALTER POLICY contributions_read ON transactions RENAME TO transactions_read;
  END IF;
  
  -- Check and rename write policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'contributions_write'
  ) THEN
    ALTER POLICY contributions_write ON transactions RENAME TO transactions_write;
  END IF;
  
  -- Check and rename insert policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'contributions_insert'
  ) THEN
    ALTER POLICY contributions_insert ON transactions RENAME TO transactions_insert;
  END IF;
  
  -- Check and rename update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'contributions_update'
  ) THEN
    ALTER POLICY contributions_update ON transactions RENAME TO transactions_update;
  END IF;
  
  -- Check and rename delete policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions' 
    AND policyname = 'contributions_delete'
  ) THEN
    ALTER POLICY contributions_delete ON transactions RENAME TO transactions_delete;
  END IF;
END $$;


-- Add comments
comment ON TABLE transactions IS 'Accounting layer: immutable ledger of all financial transactions';


comment ON COLUMN transactions.kind IS 'Transaction type: payment (income), refund (return), adjustment (correction), transfer (allocation)';


comment ON COLUMN transactions.stripe_event_id IS 'Stripe webhook event ID for idempotency - prevents duplicate transaction records from same webhook';


comment ON COLUMN transactions.donation_id IS 'Links to the donation this transaction is part of (business layer)';


comment ON COLUMN transactions.donation_allocation_id IS 'Links to specific allocation if this is a transfer transaction';


comment ON COLUMN transactions.payment_attempt_id IS 'Links to Stripe payment attempt (provider layer)';


-- Update project_budget_costs table - Ensure consistency
ALTER TABLE project_budget_costs
ADD COLUMN IF NOT EXISTS description TEXT;


ALTER TABLE project_budget_costs
ADD COLUMN IF NOT EXISTS receipt_url TEXT;


-- Ensure indexes exist on project_budget_costs
CREATE INDEX if NOT EXISTS idx_project_budget_costs_project ON project_budget_costs (project_id);


CREATE INDEX if NOT EXISTS idx_project_budget_costs_occurred ON project_budget_costs (occurred_at DESC);


-- Add comments
comment ON TABLE project_budget_costs IS 'Line items for project expenses';


comment ON COLUMN project_budget_costs.description IS 'Description of the expense';


comment ON COLUMN project_budget_costs.receipt_url IS 'Optional URL to receipt/invoice document';


-- Add funding status to language_entities
ALTER TABLE language_entities
ADD COLUMN IF NOT EXISTS funding_status entity_status DEFAULT 'draft';


CREATE INDEX if NOT EXISTS idx_language_entities_funding_status ON language_entities (funding_status)
WHERE
  deleted_at IS NULL;


comment ON COLUMN language_entities.funding_status IS 'Funding availability: draft (hidden), available (accepting donations), funded (goal met), archived (closed)';


-- Add funding status to regions
ALTER TABLE regions
ADD COLUMN IF NOT EXISTS funding_status entity_status DEFAULT 'draft';


CREATE INDEX if NOT EXISTS idx_regions_funding_status ON regions (funding_status)
WHERE
  deleted_at IS NULL;


comment ON COLUMN regions.funding_status IS 'Funding availability: draft (hidden), available (accepting donations), funded (goal met), archived (closed)';

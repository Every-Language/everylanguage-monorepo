-- Drop transactions table and refactor finance layers
-- Separates business logic (donations) from payment provider (payment_attempts)
-- ============================================================================
-- PART 1: DROP TRANSACTIONS TABLE AND TRIGGER
-- ============================================================================
-- Drop the trigger that creates transactions from allocations
DROP TRIGGER if EXISTS trigger_create_transaction_from_allocation ON donation_allocations;


-- Drop the function that creates transactions
DROP FUNCTION if EXISTS create_transaction_from_allocation () cascade;


-- Drop transactions table (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS transactions cascade;


-- ============================================================================
-- PART 2: REFACTOR DONATIONS TABLE - REMOVE PAYMENT PROVIDER FIELDS
-- ============================================================================
-- Keep only business logic fields in donations:
-- - payment_method: donor's payment preference (business logic)
-- - is_recurring: donor's intent to set up recurring donation (business logic)
-- Remove Stripe-specific fields (move to payment_attempts):
-- - stripe_customer_id: payment provider detail
-- - stripe_payment_intent_id: payment provider detail (already in payment_attempts)
-- - stripe_subscription_id: payment provider detail (for recurring)
-- Drop Stripe fields from donations
ALTER TABLE donations
DROP COLUMN IF EXISTS stripe_customer_id cascade,
DROP COLUMN IF EXISTS stripe_payment_intent_id cascade,
DROP COLUMN IF EXISTS stripe_subscription_id cascade;


-- Drop indexes that reference dropped columns
DROP INDEX if EXISTS idx_donations_stripe_customer;


DROP INDEX if EXISTS idx_donations_stripe_pi;


DROP INDEX if EXISTS idx_donations_stripe_sub;


-- ============================================================================
-- PART 3: ADD PAYMENT PROVIDER FIELDS TO payment_attempts
-- ============================================================================
-- payment_attempts should be the single source of truth for Stripe payment details
-- Add stripe_customer_id to payment_attempts (for linking to Stripe Customer)
ALTER TABLE payment_attempts
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;


-- Add stripe_subscription_id to payment_attempts (for recurring payments)
ALTER TABLE payment_attempts
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;


-- Create indexes for new columns
CREATE INDEX if NOT EXISTS idx_payment_attempts_stripe_customer ON payment_attempts (stripe_customer_id)
WHERE
  stripe_customer_id IS NOT NULL;


CREATE INDEX if NOT EXISTS idx_payment_attempts_stripe_subscription ON payment_attempts (stripe_subscription_id)
WHERE
  stripe_subscription_id IS NOT NULL;


-- Add comments
comment ON COLUMN payment_attempts.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) - links to Stripe customer for this payment';


comment ON COLUMN payment_attempts.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx) - for recurring payment attempts';


-- ============================================================================
-- PART 4: UPDATE COMMENTS TO REFLECT LAYER SEPARATION
-- ============================================================================
comment ON TABLE donations IS 'Business logic layer: donor commitments and intent for what they want to fund. Contains only business logic fields (payment_method, is_recurring). Payment provider details are in payment_attempts.';


comment ON COLUMN donations.payment_method IS 'Donor payment preference (card or bank_transfer) - business logic, not Stripe-specific';


comment ON COLUMN donations.is_recurring IS 'Donor intent to set up recurring donation - business logic';


comment ON TABLE payment_attempts IS 'Payment provider layer: complete audit trail of all Stripe payment attempts. Single source of truth for Stripe payment details (customer, payment intent, subscription).';

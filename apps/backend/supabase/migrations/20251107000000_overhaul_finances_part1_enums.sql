-- Part 1: Complete Finance System Overhaul - New Enums & Types
-- This migration creates all new enum types for the refactored finance system
-- which separates business logic, payment provider, and accounting layers
-- Donation intent types (Business Logic Layer)
CREATE TYPE donation_intent_type AS ENUM('language', 'region', 'operation', 'unrestricted');


comment ON type donation_intent_type IS 'What the donor wants to fund: specific language, region, operation, or wherever needed most';


-- Donation status (Business Logic Layer)
CREATE TYPE donation_status AS ENUM(
  'draft',
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);


comment ON type donation_status IS 'Business layer status tracking donation lifecycle from draft to completion/failure';


-- Entity status (for languages, regions, operations)
CREATE TYPE entity_status AS ENUM('draft', 'available', 'funded', 'archived');


comment ON type entity_status IS 'Funding availability status: draft (not shown), available (accepting donations), funded (goal met), archived (closed)';


-- Payment attempt status (Payment Provider Layer - mirrors Stripe PaymentIntent status)
CREATE TYPE payment_attempt_status AS ENUM(
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'requires_capture',
  'succeeded',
  'canceled',
  'failed'
);


comment ON type payment_attempt_status IS 'Payment provider layer status mirroring Stripe PaymentIntent states';


-- Payment method types
CREATE TYPE payment_method_type AS ENUM('card', 'us_bank_account', 'sepa_debit');


comment ON type payment_method_type IS 'Types of payment methods supported via Stripe';


-- Operation categories
CREATE TYPE operation_category AS ENUM(
  'travel',
  'administration',
  'legal',
  'server',
  'marketing',
  'development'
);


comment ON type operation_category IS 'Categories for operational expenses and funding';


-- Transaction kind (Accounting Layer - replaces contribution_kind)
CREATE TYPE transaction_kind AS ENUM('payment', 'refund', 'adjustment', 'transfer');


comment ON type transaction_kind IS 'Accounting ledger transaction types: payment (income), refund (return), adjustment (correction), transfer (allocation)';

-- Fix transactions table and trigger for donation allocations
-- 1. Make sponsorship_id nullable (donation allocations don't have sponsorships)
-- 2. Fix trigger function to not insert operation_id (doesn't exist in transactions table)
-- ============================================================================
-- 1. MAKE sponsorship_id NULLABLE IN transactions
-- ============================================================================
-- Donation allocations create transactions without sponsorships, so sponsorship_id must be nullable
ALTER TABLE transactions
ALTER COLUMN sponsorship_id
DROP NOT NULL;


-- ============================================================================
-- 2. FIX TRIGGER FUNCTION TO NOT INSERT operation_id
-- ============================================================================
-- The transactions table doesn't have operation_id column
-- Only project allocations should create transactions
CREATE OR REPLACE FUNCTION create_transaction_from_allocation () returns trigger AS $$
BEGIN
  -- Only create transaction if allocation is for a project (not operation)
  -- Operations are tracked separately via operation_costs
  IF NEW.project_id IS NULL THEN
    -- This is an operation allocation, skip transaction creation
    -- Operations are tracked via operation_costs table, not transactions
    RETURN NEW;
  END IF;

  -- When a donation allocation is created for a project, create corresponding accounting transaction
  -- This creates a "transfer" transaction moving funds from donation to project
  INSERT INTO transactions (
    donation_id,
    donation_allocation_id,
    project_id,
    amount_cents,
    currency_code,
    occurred_at,
    kind,
    sponsorship_id,
    created_at
  ) VALUES (
    NEW.donation_id,
    NEW.id,
    NEW.project_id,
    NEW.amount_cents,
    NEW.currency_code,
    now(),
    'transfer'::transaction_kind,
    NULL, -- Donation allocations don't have sponsorships
    now()
  );
  
  RAISE NOTICE 'Created transfer transaction for allocation % (amount: %)', 
    NEW.id, 
    NEW.amount_cents;
    
  RETURN NEW;
END;
$$ language plpgsql security definer;


comment ON function create_transaction_from_allocation () IS 'Automatically creates accounting transaction when donation is allocated to project. Operation allocations are tracked via operation_costs, not transactions.';

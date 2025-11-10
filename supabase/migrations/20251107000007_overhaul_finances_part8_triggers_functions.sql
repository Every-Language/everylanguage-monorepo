-- Part 8: Complete Finance System Overhaul - Triggers and Functions
-- Creates automated functions and triggers for the new finance system
-- ============================================================================
-- FUNCTION: Update donation updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_donation_updated_at () returns trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_update_donation_updated_at before
UPDATE ON donations FOR each ROW
EXECUTE function update_donation_updated_at ();


comment ON function update_donation_updated_at () IS 'Automatically updates updated_at timestamp when donation record is modified';


-- ============================================================================
-- FUNCTION: Update operation updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_operation_updated_at () returns trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_update_operation_updated_at before
UPDATE ON operations FOR each ROW
EXECUTE function update_operation_updated_at ();


comment ON function update_operation_updated_at () IS 'Automatically updates updated_at timestamp when operation record is modified';


-- ============================================================================
-- FUNCTION: Update operation_costs updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_operation_cost_updated_at () returns trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_update_operation_cost_updated_at before
UPDATE ON operation_costs FOR each ROW
EXECUTE function update_operation_cost_updated_at ();


comment ON function update_operation_cost_updated_at () IS 'Automatically updates updated_at timestamp when operation cost is modified';


-- ============================================================================
-- FUNCTION: Notify admins of unrestricted donations needing allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_unrestricted_donation () returns trigger AS $$
BEGIN
  -- When an unrestricted donation is completed, log notice for admin allocation
  -- (Can be extended later to send actual notifications)
  IF NEW.status = 'completed' AND NEW.intent_type = 'unrestricted' THEN
    RAISE NOTICE 'Unrestricted donation % (amount: %) requires allocation', 
      NEW.id, 
      NEW.amount_cents;
  END IF;
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_notify_unrestricted_donation
AFTER
UPDATE of status ON donations FOR each ROW WHEN (
  new.status = 'completed'
  AND new.intent_type = 'unrestricted'
)
EXECUTE function notify_unrestricted_donation ();


comment ON function notify_unrestricted_donation () IS 'Notifies admins when unrestricted donations are completed and need manual allocation';


-- ============================================================================
-- FUNCTION: Create accounting transaction from donation allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION create_transaction_from_allocation () returns trigger AS $$
BEGIN
  -- When a donation allocation is created, create corresponding accounting transaction
  -- This creates a "transfer" transaction moving funds from donation to project/operation
  INSERT INTO transactions (
    donation_id,
    donation_allocation_id,
    project_id,
    operation_id,
    amount_cents,
    currency_code,
    occurred_at,
    kind,
    created_at
  ) VALUES (
    NEW.donation_id,
    NEW.id,
    NEW.project_id,
    NEW.operation_id,
    NEW.amount_cents,
    NEW.currency_code,
    now(),
    'transfer'::transaction_kind,
    now()
  );
  
  RAISE NOTICE 'Created transfer transaction for allocation % (amount: %)', 
    NEW.id, 
    NEW.amount_cents;
    
  RETURN NEW;
END;
$$ language plpgsql security definer;


CREATE TRIGGER trigger_create_transaction_from_allocation
AFTER insert ON donation_allocations FOR each ROW
EXECUTE function create_transaction_from_allocation ();


comment ON function create_transaction_from_allocation () IS 'Automatically creates accounting transaction when donation is allocated to project/operation';


-- ============================================================================
-- FUNCTION: Validate donation allocation amount
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_donation_allocation () returns trigger AS $$
DECLARE
  v_donation_amount INTEGER;
  v_total_allocated INTEGER;
BEGIN
  -- Get the donation amount
  SELECT amount_cents INTO v_donation_amount
  FROM donations
  WHERE id = NEW.donation_id;
  
  -- Calculate total allocated (including this new allocation)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_allocated
  FROM donation_allocations
  WHERE donation_id = NEW.donation_id
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Check if total allocation would exceed donation amount
  IF (v_total_allocated + NEW.amount_cents) > v_donation_amount THEN
    RAISE EXCEPTION 'Total allocations (% + %) exceed donation amount (%)', 
      v_total_allocated, 
      NEW.amount_cents, 
      v_donation_amount
      USING HINT = 'Reduce allocation amount or remove existing allocations';
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_validate_donation_allocation before insert
OR
UPDATE ON donation_allocations FOR each ROW
EXECUTE function validate_donation_allocation ();


comment ON function validate_donation_allocation () IS 'Validates that total allocations do not exceed donation amount';


-- ============================================================================
-- FUNCTION: Update payment method default status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payment_method_default () returns trigger AS $$
BEGIN
  -- When a payment method is set as default, unset all others for the same owner
  IF NEW.is_default = true THEN
    -- Unset other default payment methods for the same user
    IF NEW.user_id IS NOT NULL THEN
      UPDATE payment_methods
      SET is_default = false
      WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
    END IF;
    
    -- Unset other default payment methods for the same partner org
    IF NEW.partner_org_id IS NOT NULL THEN
      UPDATE payment_methods
      SET is_default = false
      WHERE partner_org_id = NEW.partner_org_id
      AND id != NEW.id
      AND is_default = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_update_payment_method_default before insert
OR
UPDATE of is_default ON payment_methods FOR each ROW WHEN (new.is_default = TRUE)
EXECUTE function update_payment_method_default ();


comment ON function update_payment_method_default () IS 'Ensures only one payment method per user/org can be marked as default';


-- ============================================================================
-- FUNCTION: Auto-complete donation status based on payment attempt
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_update_donation_status () returns trigger AS $$
BEGIN
  -- When a payment attempt succeeds, mark donation as completed
  IF NEW.status = 'succeeded' THEN
    UPDATE donations
    SET 
      status = 'completed'::donation_status,
      completed_at = NEW.succeeded_at
    WHERE id = NEW.donation_id
    AND status != 'completed';
    
    RAISE NOTICE 'Donation % marked as completed', NEW.donation_id;
  END IF;
  
  -- When a payment attempt fails, mark donation as failed
  IF NEW.status = 'failed' THEN
    UPDATE donations
    SET 
      status = 'failed'::donation_status
    WHERE id = NEW.donation_id
    AND status != 'failed';
    
    RAISE NOTICE 'Donation % marked as failed', NEW.donation_id;
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql security definer;


CREATE TRIGGER trigger_auto_update_donation_status
AFTER insert
OR
UPDATE of status ON payment_attempts FOR each ROW WHEN (new.status IN ('succeeded', 'failed'))
EXECUTE function auto_update_donation_status ();


comment ON function auto_update_donation_status () IS 'Automatically updates donation status based on payment attempt outcome';


-- ============================================================================
-- FUNCTION: Soft delete for payment methods
-- ============================================================================
CREATE OR REPLACE FUNCTION soft_delete_payment_method () returns trigger AS $$
BEGIN
  -- Instead of hard delete, set deleted_at
  UPDATE payment_methods
  SET deleted_at = now()
  WHERE id = OLD.id
  AND deleted_at IS NULL;
  
  -- Prevent the actual DELETE
  RETURN NULL;
END;
$$ language plpgsql;


CREATE TRIGGER trigger_soft_delete_payment_method before delete ON payment_methods FOR each ROW
EXECUTE function soft_delete_payment_method ();


comment ON function soft_delete_payment_method () IS 'Converts hard deletes to soft deletes by setting deleted_at timestamp';


-- ============================================================================
-- HELPER FUNCTION: Get unallocated donation amount
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unallocated_amount (donation_uuid UUID) returns INTEGER AS $$
DECLARE
  v_donation_amount INTEGER;
  v_allocated_amount INTEGER;
BEGIN
  -- Get donation amount
  SELECT amount_cents INTO v_donation_amount
  FROM donations
  WHERE id = donation_uuid;
  
  IF v_donation_amount IS NULL THEN
    RAISE EXCEPTION 'Donation % not found', donation_uuid;
  END IF;
  
  -- Get total allocated
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_allocated_amount
  FROM donation_allocations
  WHERE donation_id = donation_uuid
  AND (effective_to IS NULL OR effective_to >= current_date);
  
  RETURN v_donation_amount - v_allocated_amount;
END;
$$ language plpgsql stable;


comment ON function get_unallocated_amount (UUID) IS 'Returns remaining unallocated amount for a donation';


-- ============================================================================
-- HELPER FUNCTION: Get project balance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_project_balance (project_uuid UUID) returns INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance_cents INTO v_balance
  FROM vw_project_balances
  WHERE project_id = project_uuid;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ language plpgsql stable;


comment ON function get_project_balance (UUID) IS 'Returns current balance (allocated - costs) for a project';


-- ============================================================================
-- HELPER FUNCTION: Get operation balance
-- ============================================================================
CREATE OR REPLACE FUNCTION get_operation_balance (operation_uuid UUID) returns INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance_cents INTO v_balance
  FROM vw_operation_balances
  WHERE operation_id = operation_uuid;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ language plpgsql stable;


comment ON function get_operation_balance (UUID) IS 'Returns current balance (allocated - costs) for an operation';

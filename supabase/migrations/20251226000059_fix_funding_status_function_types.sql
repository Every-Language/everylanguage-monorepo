-- Fix Funding Status Function Types
-- Updates function return types and variable types to match ENUM column type
-- ============================================================================
-- ISSUE: After converting language_funding.funding_status from TEXT to ENUM,
-- the functions still use TEXT types, causing type mismatch errors when updating.
-- ============================================================================
-- ============================================================================
-- PART 1: FIX calculate_language_funding_status() FUNCTION
-- ============================================================================
-- Change return type from TEXT to funding_status enum
-- Change v_current_status variable from TEXT to funding_status enum
-- Note: PostgreSQL doesn't allow changing return types, so we must DROP and recreate
DROP FUNCTION if EXISTS calculate_language_funding_status (UUID);


CREATE FUNCTION calculate_language_funding_status (language_id UUID) returns funding_status language plpgsql stable AS $$
DECLARE
  v_budget_cents INTEGER;
  v_current_status funding_status;  -- Changed from TEXT to funding_status
  v_total_intents_cents BIGINT;
BEGIN
  -- Get current budget and status
  SELECT budget_cents, funding_status INTO v_budget_cents, v_current_status
  FROM language_funding
  WHERE language_entity_id = language_id
    AND deleted_at IS NULL;
  
  -- If no funding record exists, return NULL (not tracked)
  IF v_budget_cents IS NULL AND v_current_status IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If archived, preserve manual status
  IF v_current_status = 'archived' THEN
    RETURN 'archived'::funding_status;
  END IF;
  
  -- If budget not set, return draft
  IF v_budget_cents IS NULL THEN
    RETURN 'draft'::funding_status;
  END IF;
  
  -- Calculate total donation intents for this language
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_intents_cents
  FROM donations
  WHERE intent_language_entity_id = language_id
    AND status = 'completed'
    AND deleted_at IS NULL;
  
  -- Determine status based on budget and intents
  IF v_total_intents_cents = 0 THEN
    RETURN 'available'::funding_status;
  ELSIF v_total_intents_cents < v_budget_cents THEN
    RETURN 'in_progress'::funding_status;
  ELSE
    RETURN 'funded'::funding_status;
  END IF;
END;
$$;


comment ON function calculate_language_funding_status IS 'Calculates the funding status for a language based on budget and donation intents. Preserves archived status. Returns funding_status enum type.';


-- ============================================================================
-- PART 2: FIX update_language_funding_status_on_donation() FUNCTION
-- ============================================================================
-- Change new_status variable from TEXT to funding_status enum
-- Note: We can use CREATE OR REPLACE here since we're only changing variable types, not return type
CREATE OR REPLACE FUNCTION update_language_funding_status_on_donation () returns trigger language plpgsql security definer AS $$
DECLARE
  affected_language_id UUID;
  new_status funding_status;  -- Changed from TEXT to funding_status
BEGIN
  -- Determine which language was affected
  IF TG_OP = 'DELETE' THEN
    affected_language_id := OLD.intent_language_entity_id;
  ELSE
    affected_language_id := NEW.intent_language_entity_id;
  END IF;
  
  -- Only process if donation intent targets a language and status is completed
  IF affected_language_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP != 'DELETE' AND NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Recalculate status for affected language
  new_status := calculate_language_funding_status(affected_language_id);
  
  -- Update language_funding if record exists and not archived
  IF new_status IS NOT NULL THEN
    UPDATE language_funding
    SET funding_status = new_status,
        updated_at = NOW()
    WHERE language_entity_id = affected_language_id
      AND deleted_at IS NULL
      AND funding_status != 'archived'::funding_status; -- Preserve manual archived status
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


comment ON function update_language_funding_status_on_donation IS 'Trigger function to automatically update language funding status when donations change. Uses funding_status enum type.';

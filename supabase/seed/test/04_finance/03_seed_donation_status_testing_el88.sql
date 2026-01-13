-- Test Donations for EL-88: Donation Status Verification
-- Creates donations with various statuses to test real-time status updates
-- ============================================================================
-- DONATIONS WITH VARIOUS STATUSES
-- ============================================================================
INSERT INTO
  public.donations (
    id,
    user_id,
    partner_org_id,
    intent_type,
    intent_language_entity_id,
    intent_region_id,
    intent_operation_id,
    amount_cents,
    currency_code,
    status,
    payment_method,
    is_recurring,
    is_manual,
    created_by,
    created_at,
    updated_at,
    completed_at
  )
VALUES
  -- Donation 1: PENDING status (card payment, should show "Confirmed" optimistically)
  (
    'ee0e8400-e29b-41d4-a716-446655440030',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'language',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL, -- intent_region_id
    NULL, -- intent_operation_id
    50000, -- $500
    'USD',
    'pending', -- Will test transition to completed/failed
    'card',
    FALSE,
    TRUE, -- is_manual: Allow updates for testing
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '5 minutes',
    NULL
  ),
  -- Donation 2: FAILED status (card payment that failed)
  (
    'ee0e8400-e29b-41d4-a716-446655440031',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'language',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL, -- intent_region_id
    NULL, -- intent_operation_id
    25000, -- $250
    'USD',
    'failed', -- Should show error message
    'card',
    FALSE,
    TRUE, -- is_manual: Allow updates for testing
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '2 minutes',
    NULL
  ),
  -- Donation 3: PROCESSING status (in between pending and completed)
  (
    'ee0e8400-e29b-41d4-a716-446655440032',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'operation',
    NULL, -- intent_language_entity_id
    NULL, -- intent_region_id
    'dd0e8400-e29b-41d4-a716-446655440010', -- intent_operation_id: Server Infrastructure
    75000, -- $750
    'USD',
    'processing', -- Should transition to completed
    'card',
    FALSE,
    TRUE, -- is_manual: Allow updates for testing
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '3 minutes',
    NOW() - INTERVAL '3 minutes',
    NULL
  ),
  -- Donation 4: COMPLETED status (successful payment)
  (
    'ee0e8400-e29b-41d4-a716-446655440033',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'language',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL, -- intent_region_id
    NULL, -- intent_operation_id
    100000, -- $1,000
    'USD',
    'completed', -- Should stay confirmed
    'card',
    FALSE,
    TRUE, -- is_manual: Allow updates for testing
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  -- Donation 5: Bank transfer (should show "Pending", no status update needed)
  -- Note: Frontend uses 'bank_transfer' but database enum is 'us_bank_account'
  (
    'ee0e8400-e29b-41d4-a716-446655440034',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'unrestricted',
    NULL, -- intent_language_entity_id
    NULL, -- intent_region_id
    NULL, -- intent_operation_id
    200000, -- $2,000
    'USD',
    'pending', -- Bank transfer, should show "Pending"
    'us_bank_account', -- Database enum value (frontend uses 'bank_transfer')
    FALSE,
    TRUE, -- is_manual: Allow updates for testing
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PAYMENT ATTEMPTS (to trigger status updates via database trigger)
-- ============================================================================
-- Note: Using ON CONFLICT on stripe_payment_intent_id since it's unique
INSERT INTO
  public.payment_attempts (
    donation_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    amount_cents,
    currency_code,
    status,
    created_at,
    succeeded_at
  )
VALUES
  -- Payment attempt for pending donation (will transition to completed when updated)
  (
    'ee0e8400-e29b-41d4-a716-446655440030',
    'pi_test_pending_123',
    'cus_test_123',
    50000,
    'USD',
    'processing', -- Will be updated to 'succeeded' or 'failed' to test trigger
    NOW() - INTERVAL '5 minutes',
    NULL
  ),
  -- Payment attempt for failed donation
  (
    'ee0e8400-e29b-41d4-a716-446655440031',
    'pi_test_failed_123',
    'cus_test_123',
    25000,
    'USD',
    'failed', -- Already failed, donation status should be 'failed'
    NOW() - INTERVAL '10 minutes',
    NULL
  ),
  -- Payment attempt for processing donation
  (
    'ee0e8400-e29b-41d4-a716-446655440032',
    'pi_test_processing_123',
    'cus_test_123',
    75000,
    'USD',
    'processing', -- Will transition to succeeded
    NOW() - INTERVAL '3 minutes',
    NULL
  ),
  -- Payment attempt for completed donation
  (
    'ee0e8400-e29b-41d4-a716-446655440033',
    'pi_test_completed_123',
    'cus_test_123',
    100000,
    'USD',
    'succeeded', -- Already succeeded
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (stripe_payment_intent_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE donations IS 'Test donations for EL-88: Includes pending, failed, processing, and completed statuses to test real-time status verification';

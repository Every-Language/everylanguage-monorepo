-- Finance Models Seed Data
-- Operations, Donations, Donation Allocations, and Exchange Rates
-- Note: sponsorships, language_adoptions, and project_budgets tables were dropped in migration 20251107000005
-- ============================================================================
-- OPERATIONS
-- ============================================================================
INSERT INTO
  public.operations (
    id,
    name,
    description,
    category,
    status,
    display_order,
    is_public,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    'dd0e8400-e29b-41d4-a716-446655440010',
    'Server Infrastructure',
    'Cloud hosting and server costs',
    'server',
    'available',
    1,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    'dd0e8400-e29b-41d4-a716-446655440011',
    'Travel Expenses',
    'Team travel and accommodation',
    'travel',
    'available',
    2,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '30 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- DONATIONS
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
    created_by,
    created_at,
    updated_at,
    completed_at
  )
VALUES
  -- User donation for language (requires both user_id and partner_org_id per migration 20251226000062)
  (
    'ee0e8400-e29b-41d4-a716-446655440010',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'language',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NULL,
    1000000, -- $10,000
    'USD',
    'completed',
    'card',
    FALSE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '15 days',
    NOW(),
    NOW() - INTERVAL '15 days'
  ),
  -- Partner org donation for operation (requires both user_id and partner_org_id)
  (
    'ee0e8400-e29b-41d4-a716-446655440011',
    '880e8400-e29b-41d4-a716-446655440014', -- partneradmin@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'operation',
    NULL,
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    500000, -- $5,000
    'USD',
    'completed',
    'card',
    TRUE,
    '880e8400-e29b-41d4-a716-446655440014', -- partneradmin@everylanguage.com
    NOW() - INTERVAL '10 days',
    NOW(),
    NOW() - INTERVAL '10 days'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- DONATION_ALLOCATIONS
-- ============================================================================
INSERT INTO
  public.donation_allocations (
    id,
    donation_id,
    project_id,
    operation_id,
    amount_cents,
    currency_code,
    effective_from,
    created_by,
    created_at,
    notes
  )
VALUES
  -- Allocate donation to project
  (
    'ff0e8400-e29b-41d4-a716-446655440010',
    'ee0e8400-e29b-41d4-a716-446655440010',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    NULL,
    1000000, -- $10,000
    'USD',
    CURRENT_DATE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '15 days',
    'Test allocation to project'
  ),
  -- Allocate donation to operation
  (
    'ff0e8400-e29b-41d4-a716-446655440011',
    'ee0e8400-e29b-41d4-a716-446655440011',
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    500000, -- $5,000
    'USD',
    CURRENT_DATE,
    '880e8400-e29b-41d4-a716-446655440014',
    NOW() - INTERVAL '10 days',
    'Test allocation to operation'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- OPERATION_COSTS
-- ============================================================================
INSERT INTO
  public.operation_costs (
    id,
    operation_id,
    amount_cents,
    currency_code,
    occurred_at,
    category,
    description,
    receipt_url,
    created_by,
    created_at,
    updated_at
  )
VALUES
  (
    '110e8400-e29b-41d4-a716-446655440010',
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    50000, -- $500
    'USD',
    NOW() - INTERVAL '5 days',
    'server',
    'Monthly cloud hosting bill',
    'https://example.com/receipts/cloud-hosting.pdf',
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '5 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;


-- Note: exchange_rates table was dropped in migration 20251226000026

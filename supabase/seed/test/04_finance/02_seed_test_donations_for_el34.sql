-- Test Donations Seed Data for EL-34
-- Creates 5 test donations with various allocation scenarios to test the donation allocation modal
-- This demonstrates the issue where operation/project IDs are shown instead of names
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
    is_manual,
    created_by,
    created_at,
    updated_at,
    completed_at
  )
VALUES
  -- Donation 1: Operation allocation only
  (
    'ee0e8400-e29b-41d4-a716-446655440020',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'operation',
    NULL,
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    500000, -- $5,000
    'USD',
    'completed',
    'card',
    FALSE,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),
  -- Donation 2: Project allocation only
  (
    'ee0e8400-e29b-41d4-a716-446655440021',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'language',
    '990e8400-e29b-41d4-a716-446655440001', -- Lang A
    NULL,
    NULL,
    750000, -- $7,500
    'USD',
    'completed',
    'card',
    FALSE,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days'
  ),
  -- Donation 3: Multiple allocations (both operation and project)
  (
    'ee0e8400-e29b-41d4-a716-446655440022',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'unrestricted',
    NULL,
    NULL,
    NULL,
    1000000, -- $10,000
    'USD',
    'completed',
    'card',
    FALSE,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
  ),
  -- Donation 4: Multiple project allocations
  (
    'ee0e8400-e29b-41d4-a716-446655440023',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'unrestricted',
    NULL,
    NULL,
    NULL,
    1200000, -- $12,000
    'USD',
    'completed',
    'us_bank_account',
    TRUE,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '12 days'
  ),
  -- Donation 5: Mixed allocations (operation + multiple projects)
  (
    'ee0e8400-e29b-41d4-a716-446655440024',
    '880e8400-e29b-41d4-a716-446655440001', -- testuser@everylanguage.com
    'bb0e8400-e29b-41d4-a716-446655440001', -- Kona Community Church
    'unrestricted',
    NULL,
    NULL,
    NULL,
    1500000, -- $15,000
    'USD',
    'completed',
    'card',
    FALSE,
    TRUE,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
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
    effective_to,
    created_by,
    created_at,
    notes
  )
VALUES
  -- Donation 1: Single operation allocation
  (
    'ff0e8400-e29b-41d4-a716-446655440020',
    'ee0e8400-e29b-41d4-a716-446655440020',
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    500000, -- $5,000
    'USD',
    CURRENT_DATE - INTERVAL '20 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '20 days',
    'Allocation to Server Infrastructure operation'
  ),
  -- Donation 2: Single project allocation
  (
    'ff0e8400-e29b-41d4-a716-446655440021',
    'ee0e8400-e29b-41d4-a716-446655440021',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    NULL,
    750000, -- $7,500
    'USD',
    CURRENT_DATE - INTERVAL '18 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '18 days',
    'Allocation to Test Project Kona'
  ),
  -- Donation 3: Multiple allocations (operation + project)
  (
    'ff0e8400-e29b-41d4-a716-446655440022',
    'ee0e8400-e29b-41d4-a716-446655440022',
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440010', -- Server Infrastructure
    400000, -- $4,000
    'USD',
    CURRENT_DATE - INTERVAL '15 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '15 days',
    'First allocation: Server Infrastructure operation'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440023',
    'ee0e8400-e29b-41d4-a716-446655440022',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    NULL,
    600000, -- $6,000
    'USD',
    CURRENT_DATE - INTERVAL '15 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '15 days',
    'Second allocation: Test Project Kona'
  ),
  -- Donation 4: Multiple project allocations
  (
    'ff0e8400-e29b-41d4-a716-446655440024',
    'ee0e8400-e29b-41d4-a716-446655440023',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    NULL,
    600000, -- $6,000
    'USD',
    CURRENT_DATE - INTERVAL '12 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '12 days',
    'First project allocation: Test Project Kona'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440025',
    'ee0e8400-e29b-41d4-a716-446655440023',
    (SELECT id FROM projects WHERE name = 'Test Project 1' LIMIT 1), -- Use dynamic project from test seed
    NULL,
    600000, -- $6,000
    'USD',
    CURRENT_DATE - INTERVAL '12 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '12 days',
    'Second project allocation: Test Project 1'
  ),
  -- Donation 5: Mixed allocations (operation + multiple projects)
  (
    'ff0e8400-e29b-41d4-a716-446655440026',
    'ee0e8400-e29b-41d4-a716-446655440024',
    NULL,
    'dd0e8400-e29b-41d4-a716-446655440011', -- Travel Expenses
    500000, -- $5,000
    'USD',
    CURRENT_DATE - INTERVAL '10 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    'First allocation: Travel Expenses operation'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440027',
    'ee0e8400-e29b-41d4-a716-446655440024',
    'aa0e8400-e29b-41d4-a716-446655440001', -- Test Project Kona
    NULL,
    500000, -- $5,000
    'USD',
    CURRENT_DATE - INTERVAL '10 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    'Second allocation: Test Project Kona'
  ),
  (
    'ff0e8400-e29b-41d4-a716-446655440028',
    'ee0e8400-e29b-41d4-a716-446655440024',
    (SELECT id FROM projects WHERE name = 'Test Project 2' LIMIT 1), -- Use dynamic project from test seed
    NULL,
    500000, -- $5,000
    'USD',
    CURRENT_DATE - INTERVAL '10 days',
    NULL,
    '880e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '10 days',
    'Third allocation: Test Project 2'
  )
ON CONFLICT (id) DO NOTHING;

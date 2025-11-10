-- Part 5: Complete Finance System Overhaul - Balance Calculation Views
-- Creates views to calculate real-time balances for donations, projects, and operations
-- Drop existing views first (from old schema)
DROP VIEW if EXISTS vw_project_balances cascade;


DROP VIEW if EXISTS vw_donation_remaining cascade;


DROP VIEW if EXISTS vw_operation_balances cascade;


DROP VIEW if EXISTS vw_unallocated_donations cascade;


DROP VIEW if EXISTS vw_project_funding_summary cascade;


-- vw_donation_remaining - Shows how much of each donation is unallocated
CREATE OR REPLACE VIEW vw_donation_remaining AS
SELECT
  d.id AS donation_id,
  d.user_id,
  d.partner_org_id,
  d.intent_type,
  d.intent_language_entity_id,
  d.intent_region_id,
  d.intent_operation_id,
  d.amount_cents AS total_donation_cents,
  COALESCE(SUM(da.amount_cents), 0) AS allocated_cents,
  d.amount_cents - COALESCE(SUM(da.amount_cents), 0) AS remaining_cents,
  d.currency_code,
  d.status,
  d.is_recurring,
  d.created_at,
  d.completed_at
FROM
  donations d
  LEFT JOIN donation_allocations da ON da.donation_id = d.id
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
WHERE
  d.deleted_at IS NULL
  AND d.status = 'completed' -- Only completed donations have funds to allocate
GROUP BY
  d.id;


comment ON view vw_donation_remaining IS 'Shows remaining unallocated funds for each completed donation. Used by admins to track which donations need allocation.';


-- vw_project_balances - Project funding status
CREATE OR REPLACE VIEW vw_project_balances AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.target_language_entity_id AS language_entity_id,
  -- Total allocated from donations (business layer)
  COALESCE(SUM(da.amount_cents), 0) AS total_allocated_cents,
  -- Total from accounting transactions (should match allocated after reconciliation)
  COALESCE(
    SUM(t.amount_cents) FILTER (
      WHERE
        t.kind = 'payment'
    ),
    0
  ) AS total_transactions_cents,
  -- Total costs
  COALESCE(SUM(costs.amount_cents), 0) AS total_costs_cents,
  -- Balance (allocated - costs)
  COALESCE(SUM(da.amount_cents), 0) - COALESCE(SUM(costs.amount_cents), 0) AS balance_cents,
  'USD' AS currency_code,
  -- Counts
  COUNT(DISTINCT da.id) AS allocation_count,
  COUNT(DISTINCT t.id) AS transaction_count,
  COUNT(DISTINCT costs.id) AS cost_count,
  -- Last activity dates
  MAX(t.occurred_at) AS last_transaction_at,
  MAX(costs.occurred_at) AS last_cost_at
FROM
  projects p
  LEFT JOIN donation_allocations da ON da.project_id = p.id
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
  LEFT JOIN transactions t ON t.project_id = p.id
  LEFT JOIN project_budget_costs costs ON costs.project_id = p.id
WHERE
  p.deleted_at IS NULL
GROUP BY
  p.id,
  p.name,
  p.target_language_entity_id;


comment ON view vw_project_balances IS 'Real-time project balance: allocated funds minus costs. Shows financial health of each project.';


-- vw_operation_balances - Operational funding status
CREATE OR REPLACE VIEW vw_operation_balances AS
SELECT
  o.id AS operation_id,
  o.name AS operation_name,
  o.category,
  o.status,
  -- Total allocated from donations
  COALESCE(SUM(da.amount_cents), 0) AS total_allocated_cents,
  -- Total costs
  COALESCE(SUM(costs.amount_cents), 0) AS total_costs_cents,
  -- Balance
  COALESCE(SUM(da.amount_cents), 0) - COALESCE(SUM(costs.amount_cents), 0) AS balance_cents,
  'USD' AS currency_code,
  -- Counts
  COUNT(DISTINCT da.id) AS allocation_count,
  COUNT(DISTINCT costs.id) AS cost_count,
  -- Last activity
  MAX(costs.occurred_at) AS last_cost_at,
  o.created_at,
  o.updated_at
FROM
  operations o
  LEFT JOIN donation_allocations da ON da.operation_id = o.id
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
  LEFT JOIN operation_costs costs ON costs.operation_id = o.id
WHERE
  o.deleted_at IS NULL
GROUP BY
  o.id,
  o.name,
  o.category,
  o.status,
  o.created_at,
  o.updated_at;


comment ON view vw_operation_balances IS 'Real-time operation balance: allocated funds minus costs. Shows financial health of each operational category.';


-- Helper view for admin dashboard: donations needing allocation
CREATE OR REPLACE VIEW vw_unallocated_donations AS
SELECT
  dr.*
FROM
  vw_donation_remaining dr
WHERE
  dr.remaining_cents > 0
  AND dr.status = 'completed'
ORDER BY
  dr.created_at ASC;


comment ON view vw_unallocated_donations IS 'Helper view showing donations with unallocated funds, ordered by oldest first. Used in admin allocations page.';


-- Helper view: project funding summary with language details
CREATE OR REPLACE VIEW vw_project_funding_summary AS
SELECT
  pb.*,
  le.name AS language_name,
  CASE
    WHEN pb.balance_cents <= 0 THEN 'critical'
    WHEN pb.balance_cents < 50000 THEN 'low' -- Less than $500
    WHEN pb.balance_cents < 100000 THEN 'medium' -- Less than $1000
    ELSE 'healthy'
  END AS funding_health
FROM
  vw_project_balances pb
  LEFT JOIN language_entities le ON le.id = pb.language_entity_id;


comment ON view vw_project_funding_summary IS 'Project balances enriched with language details and funding health indicators';

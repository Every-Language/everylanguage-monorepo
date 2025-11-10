-- Part 6: Complete Finance System Overhaul - Drop Old Tables and Views
-- Removes deprecated tables and views from the old finance system
-- Drop old views first (views depend on tables)
DROP VIEW if EXISTS vw_partner_org_active_projects cascade;


DROP VIEW if EXISTS vw_partner_org_pending_languages cascade;


DROP VIEW if EXISTS vw_partner_org_language_entities cascade;


DROP VIEW if EXISTS vw_project_balances_old cascade;


-- Drop old tables in reverse dependency order
-- (child tables before parent tables to avoid foreign key constraint violations)
-- Drop sponsorship-related tables
DROP TABLE IF EXISTS language_adoption_sponsorship_allocations cascade;


DROP TABLE IF EXISTS language_adoption_sponsorships cascade;


DROP TABLE IF EXISTS sponsorship_allocations cascade;


DROP TABLE IF EXISTS sponsorships cascade;


-- Drop language adoption table
DROP TABLE IF EXISTS language_adoptions cascade;


-- Drop project budget tables (estimated budgets no longer used)
DROP TABLE IF EXISTS project_budget_items cascade;


DROP TABLE IF EXISTS project_budgets cascade;


-- Drop project financials materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS project_financials cascade;


-- Drop subscriptions table (will be recreated later if needed with new structure)
DROP TABLE IF EXISTS subscriptions cascade;


-- Drop old enum types that are no longer used
DROP TYPE if EXISTS contribution_kind cascade;


DROP TYPE if EXISTS sponsorship_status cascade;


DROP TYPE if EXISTS adoption_status cascade;


DROP TYPE if EXISTS subscription_type cascade;


-- Note: We keep project_budget_costs (renamed from project_budget_actual_costs)
-- as it's still used for tracking actual project expenses
comment ON schema public IS 'Old finance system tables and views removed. New donation-based system now in place with proper layer separation: business logic (donations, allocations, operations), payment provider (payment_attempts, payment_methods), and accounting (transactions).';

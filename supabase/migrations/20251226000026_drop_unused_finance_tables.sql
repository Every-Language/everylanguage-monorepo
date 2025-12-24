-- Drop unused finance tables and views, rename views
-- Migration: 20251226000026_drop_unused_finance_tables.sql
-- ============================================================================
-- These tables have been identified as unused:
-- - exchange_rates: 0 rows, no code references
-- - funding_settings: 1 row, no code references  
-- - partner_wallets: 0 rows, not in current finance model
-- - partner_wallet_transactions: 0 rows, not in current finance model
-- - project_budget_costs: 0 rows, replaced by operation_costs
-- - stripe_events: 1076 rows, all failures, not being written to by webhook
-- ============================================================================
-- Views to rename:
-- - vw_operation_balances -> operation_balances (used in admin dashboard)
-- - language_funding_remaining -> language_funding_balances (used in admin & partnership dashboards)
-- ============================================================================
-- Views to drop (unused):
-- - vw_project_balances (not used in code, references project_budget_costs which is being dropped)
-- - vw_donation_remaining (not used in code)
-- - vw_unallocated_donations (not used in code)
-- - vw_project_funding_summary (not used in code, depends on vw_project_balances)
-- ============================================================================
-- Drop views first (they depend on tables)
DROP VIEW if EXISTS public.vw_project_funding_summary cascade;


DROP VIEW if EXISTS public.vw_project_balances cascade;


DROP VIEW if EXISTS public.vw_unallocated_donations cascade;


DROP VIEW if EXISTS public.vw_donation_remaining cascade;


-- Rename views (using DO block for safety)
DO $$
BEGIN
  -- Rename vw_operation_balances to operation_balances
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'vw_operation_balances') THEN
    ALTER VIEW public.vw_operation_balances RENAME TO operation_balances;
  END IF;
  
  -- Rename language_funding_remaining to language_funding_balances
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'language_funding_remaining') THEN
    ALTER VIEW public.language_funding_remaining RENAME TO language_funding_balances;
  END IF;
END $$;


-- Drop tables in reverse dependency order (child tables first)
DROP TABLE IF EXISTS public.partner_wallet_transactions cascade;


DROP TABLE IF EXISTS public.partner_wallets cascade;


DROP TABLE IF EXISTS public.project_budget_costs cascade;


DROP TABLE IF EXISTS public.exchange_rates cascade;


DROP TABLE IF EXISTS public.funding_settings cascade;


DROP TABLE IF EXISTS public.stripe_events cascade;

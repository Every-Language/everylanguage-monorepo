-- Fix Function Search Path Security Issue
-- Migration: 20251226000096_fix_function_search_paths.sql
-- 
-- This migration addresses the "Function Search Path Mutable" security warnings
-- by explicitly setting search_path = public on all user-defined functions.
-- This prevents search path injection attacks where malicious schemas could
-- hijack table references within functions.
--
-- Based on Supabase advisor findings: 68 functions need search_path set
-- This migration fixes functions that exist and need search_path set
-- Uses idempotent DO blocks to check function existence before altering
-- ============================================================================
-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================
-- Update operation_costs updated_at timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_operation_cost_updated_at'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_operation_cost_updated_at() SET search_path = public;
  END IF;
END $$;


-- Update region_funding_overrides updated_at timestamp  
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_region_funding_overrides_updated_at'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_region_funding_overrides_updated_at() SET search_path = public;
  END IF;
END $$;


-- Generic trigger function for setting timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trigger_set_timestamp'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION trigger_set_timestamp() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- FINANCE & DONATION FUNCTIONS
-- ============================================================================
-- Convert currency amounts to USD
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'convert_to_usd'
    AND pg_get_function_identity_arguments(p.oid) = 'p_amount_cents integer, p_currency_code character, p_as_of_date date'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION convert_to_usd(p_amount_cents integer, p_currency_code character, p_as_of_date date) SET search_path = public;
  END IF;
END $$;


-- Allocate deposit to projects (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'allocate_deposit_to_projects'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION allocate_deposit_to_projects() SET search_path = public;
  END IF;
END $$;


-- Update language funding status when donation changes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_language_funding_status_on_donation'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_language_funding_status_on_donation() SET search_path = public;
  END IF;
END $$;


-- Soft delete payment method
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'soft_delete_payment_method'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION soft_delete_payment_method() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- ROLE ASSIGNMENT FUNCTIONS
-- ============================================================================
-- Assign base creator role (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'assign_base_creator_role'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION assign_base_creator_role() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- PROJECT & SEGMENT FUNCTIONS
-- ============================================================================
-- Get active projects with progress
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_active_projects_with_progress'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_active_projects_with_progress() SET search_path = public;
  END IF;
END $$;


-- Update segments project_id from sequences_segments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_segments_project_id_from_sequences_segments'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_segments_project_id_from_sequences_segments() SET search_path = public;
  END IF;
END $$;


-- Set sequences_segments project_id from sequence
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_sequences_segments_project_id_from_sequence'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION set_sequences_segments_project_id_from_sequence() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- PEOPLE GROUPS & STATS FUNCTIONS
-- ============================================================================
-- Refresh people groups coordinates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_people_groups_coordinates'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_people_groups_coordinates() SET search_path = public;
  END IF;
END $$;


-- Refresh people groups stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_people_groups_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_people_groups_stats() SET search_path = public;
  END IF;
END $$;


-- Transform JP people groups cache (no args)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'transform_jp_people_groups_cache'
    AND pg_get_function_identity_arguments(p.oid) = ''
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION transform_jp_people_groups_cache() SET search_path = public;
  END IF;
END $$;


-- Transform JP people groups cache (with batch params)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'transform_jp_people_groups_cache'
    AND pg_get_function_identity_arguments(p.oid) = 'batch_size integer, start_offset integer'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION transform_jp_people_groups_cache(batch_size integer, start_offset integer) SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- MATERIALIZED VIEW REFRESH FUNCTIONS
-- ============================================================================
-- Refresh progress materialized views concurrently
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_progress_materialized_views_concurrently'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_progress_materialized_views_concurrently() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- GRN MATCHING VALIDATION FUNCTIONS
-- ============================================================================
-- Validate GRN matching summary
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_summary'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_summary() SET search_path = public;
  END IF;
END $$;


-- Validate GRN matching coverage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_coverage'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_coverage() SET search_path = public;
  END IF;
END $$;


-- Validate GRN matching name consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_name_consistency'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_name_consistency() SET search_path = public;
  END IF;
END $$;


-- Validate GRN matching duplicate IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_duplicate_ids'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_duplicate_ids() SET search_path = public;
  END IF;
END $$;


-- Validate GRN matching ISO consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_iso_consistency'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_iso_consistency() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- UTILITY & DEBUG FUNCTIONS
-- ============================================================================
-- Get schema info
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_schema_info'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_schema_info() SET search_path = public;
  END IF;
END $$;


-- Debug language coordinates stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'debug_language_coordinates_stats'
    AND pg_get_function_identity_arguments(p.oid) = 'p_min_lng double precision, p_min_lat double precision, p_max_lng double precision, p_max_lat double precision, p_location_source text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION debug_language_coordinates_stats(
      p_min_lng double precision, 
      p_min_lat double precision, 
      p_max_lng double precision, 
      p_max_lat double precision, 
      p_location_source text
    ) SET search_path = public;
  END IF;
END $$;


-- Get countries with bible status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_countries_with_bible_status'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_countries_with_bible_status() SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- TEXT PROCESSING FUNCTIONS
-- ============================================================================
-- Fix double encoded UTF-8
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'fix_double_encoded_utf8'
    AND pg_get_function_identity_arguments(p.oid) = 'input_text text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION fix_double_encoded_utf8(input_text text) SET search_path = public;
  END IF;
END $$;


-- Try fix mojibake (character encoding issues)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'try_fix_mojibake'
    AND pg_get_function_identity_arguments(p.oid) = 'value text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION try_fix_mojibake(value text) SET search_path = public;
  END IF;
END $$;


-- CP1252 softmap (character encoding conversion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'cp1252_softmap'
    AND pg_get_function_identity_arguments(p.oid) = 'input bytea'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION cp1252_softmap(input bytea) SET search_path = public;
  END IF;
END $$;


-- ============================================================================
-- COMMENTS
-- ============================================================================
comment ON function update_operation_cost_updated_at () IS 'Trigger function to update updated_at timestamp. Now has search_path set for security.';


comment ON function update_region_funding_overrides_updated_at () IS 'Trigger function to update updated_at timestamp. Now has search_path set for security.';


comment ON function trigger_set_timestamp () IS 'Generic trigger function for setting updated_at timestamp. Now has search_path set for security.';


comment ON function convert_to_usd (
  p_amount_cents INTEGER,
  p_currency_code CHARACTER,
  p_as_of_date date
) IS 'Converts currency amounts to USD. Now has search_path set for security.';


comment ON function get_active_projects_with_progress () IS 'Returns active projects with their progress information. Now has search_path set for security.';


-- ============================================================================
-- ADDITIONAL FUNCTIONS FROM ADVISOR (41 more functions)
-- ============================================================================
-- Assign partner org creator role (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'assign_partner_org_creator_role'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION assign_partner_org_creator_role() SET search_path = public;
  END IF;
END $$;


-- Assign project creator role (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'assign_project_creator_role'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION assign_project_creator_role() SET search_path = public;
  END IF;
END $$;


-- Auto update donation status (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'auto_update_donation_status'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION auto_update_donation_status() SET search_path = public;
  END IF;
END $$;


-- Calculate language funding status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'calculate_language_funding_status'
    AND pg_get_function_identity_arguments(p.oid) = 'language_id uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION calculate_language_funding_status(language_id uuid) SET search_path = public;
  END IF;
END $$;


-- Enforce one role per entity (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enforce_one_role_per_entity'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION enforce_one_role_per_entity() SET search_path = public;
  END IF;
END $$;


-- Get operation balance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_operation_balance'
    AND pg_get_function_identity_arguments(p.oid) = 'operation_uuid uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_operation_balance(operation_uuid uuid) SET search_path = public;
  END IF;
END $$;


-- Get project balance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_project_balance'
    AND pg_get_function_identity_arguments(p.oid) = 'project_uuid uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_project_balance(project_uuid uuid) SET search_path = public;
  END IF;
END $$;


-- Get recent bible audio uploads
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_recent_bible_audio_uploads'
    AND pg_get_function_identity_arguments(p.oid) = 'limit_count integer'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_recent_bible_audio_uploads(limit_count integer) SET search_path = public;
  END IF;
END $$;


-- Get recent public updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_recent_public_updates'
    AND pg_get_function_identity_arguments(p.oid) = 'limit_count integer'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_recent_public_updates(limit_count integer) SET search_path = public;
  END IF;
END $$;


-- Get role priority
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_role_priority'
    AND pg_get_function_identity_arguments(p.oid) = 'role_id uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_role_priority(role_id uuid) SET search_path = public;
  END IF;
END $$;


-- Get unallocated amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_unallocated_amount'
    AND pg_get_function_identity_arguments(p.oid) = 'donation_uuid uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION get_unallocated_amount(donation_uuid uuid) SET search_path = public;
  END IF;
END $$;


-- Handle email confirmation sync (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_email_confirmation_sync'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION handle_email_confirmation_sync() SET search_path = public;
  END IF;
END $$;


-- Handle new auth user (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_auth_user'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION handle_new_auth_user() SET search_path = public;
  END IF;
END $$;


-- Mojibake fix hard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mojibake_fix_hard'
    AND pg_get_function_identity_arguments(p.oid) = 'value text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION mojibake_fix_hard(value text) SET search_path = public;
  END IF;
END $$;


-- Mojibake fix multi
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'mojibake_fix_multi'
    AND pg_get_function_identity_arguments(p.oid) = 'value text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION mojibake_fix_multi(value text) SET search_path = public;
  END IF;
END $$;


-- Notify unrestricted donation (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'notify_unrestricted_donation'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION notify_unrestricted_donation() SET search_path = public;
  END IF;
END $$;


-- Prevent manual conflict with donation (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'prevent_manual_conflict_with_donation'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION prevent_manual_conflict_with_donation() SET search_path = public;
  END IF;
END $$;


-- Protect donation sourced rows (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'protect_donation_sourced_rows'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION protect_donation_sourced_rows() SET search_path = public;
  END IF;
END $$;


-- Refresh all materialized views
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_all_materialized_views'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_all_materialized_views() SET search_path = public;
  END IF;
END $$;


-- Refresh all stats materialized views
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_all_stats_mvs'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_all_stats_mvs() SET search_path = public;
  END IF;
END $$;


-- Refresh language coordinates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_language_coordinates'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_language_coordinates() SET search_path = public;
  END IF;
END $$;


-- Refresh language coordinates map
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_language_coordinates_map'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_language_coordinates_map() SET search_path = public;
  END IF;
END $$;


-- Refresh language stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_language_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_language_stats() SET search_path = public;
  END IF;
END $$;


-- Refresh MV language stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_mv_language_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_mv_language_stats() SET search_path = public;
  END IF;
END $$;


-- Refresh MV people group stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_mv_people_group_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_mv_people_group_stats() SET search_path = public;
  END IF;
END $$;


-- Refresh MV region stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_mv_region_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_mv_region_stats() SET search_path = public;
  END IF;
END $$;


-- Refresh people groups coordinates map
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_people_groups_coordinates_map'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_people_groups_coordinates_map() SET search_path = public;
  END IF;
END $$;


-- Refresh progress materialized views full
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_progress_materialized_views_full'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_progress_materialized_views_full() SET search_path = public;
  END IF;
END $$;


-- Refresh region stats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'refresh_region_stats'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION refresh_region_stats() SET search_path = public;
  END IF;
END $$;


-- Set segments project_id from sequences_segments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_segments_project_id_from_sequences_segments'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION set_segments_project_id_from_sequences_segments() SET search_path = public;
  END IF;
END $$;


-- Transform language caches to entities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'transform_language_caches_to_entities'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION transform_language_caches_to_entities() SET search_path = public;
  END IF;
END $$;


-- Trigger update region funding status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trg_update_region_funding_status'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION trg_update_region_funding_status() SET search_path = public;
  END IF;
END $$;


-- Try fix mojibake v2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'try_fix_mojibake_v2'
    AND pg_get_function_identity_arguments(p.oid) = 'value text'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION try_fix_mojibake_v2(value text) SET search_path = public;
  END IF;
END $$;


-- Update donation updated_at (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_donation_updated_at'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_donation_updated_at() SET search_path = public;
  END IF;
END $$;


-- Update language funding updated_at (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_language_funding_updated_at'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_language_funding_updated_at() SET search_path = public;
  END IF;
END $$;


-- Update operation updated_at (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_operation_updated_at'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_operation_updated_at() SET search_path = public;
  END IF;
END $$;


-- Update payment method default (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_payment_method_default'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_payment_method_default() SET search_path = public;
  END IF;
END $$;


-- Update region funding status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_region_funding_status'
    AND pg_get_function_identity_arguments(p.oid) = 'region_id uuid'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_region_funding_status(region_id uuid) SET search_path = public;
  END IF;
END $$;


-- Update sequences_segments project_id from sequence
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_sequences_segments_project_id_from_sequence'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION update_sequences_segments_project_id_from_sequence() SET search_path = public;
  END IF;
END $$;


-- Validate allocation sum (trigger function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_allocation_sum'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_allocation_sum() SET search_path = public;
  END IF;
END $$;


-- Validate GRN matching parent child
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'validate_grn_matching_parent_child'
    AND p.proconfig IS NULL
  ) THEN
    ALTER FUNCTION validate_grn_matching_parent_child() SET search_path = public;
  END IF;
END $$;

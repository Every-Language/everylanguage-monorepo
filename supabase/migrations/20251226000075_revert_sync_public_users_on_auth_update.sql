-- Revert sync public.users on auth.users UPDATE
-- This migration reverses the changes made in 20251226000064_sync_public_users_on_auth_update.sql
-- ============================================================================
-- This removes the trigger and function that synced changes from auth.users to public.users
-- when users were updated (e.g., anonymous users being promoted to authenticated)
-- ============================================================================
-- ============================================================================
-- DROP TRIGGER: on_auth_user_updated
-- ============================================================================
-- Remove the trigger that fired AFTER UPDATE on auth.users
DROP TRIGGER if EXISTS on_auth_user_updated ON auth.users;


-- ============================================================================
-- DROP FUNCTION: handle_auth_user_update
-- ============================================================================
-- Remove the function that synced auth.users changes to public.users
DROP FUNCTION if EXISTS public.handle_auth_user_update ();

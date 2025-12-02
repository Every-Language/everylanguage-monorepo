-- Remove RPC functions that were created to bypass RLS recursion
-- Migration: 20251226000042_remove_member_rpc_functions.sql
-- 
-- These functions are no longer needed now that we've fixed RLS recursion
-- in has_permission() and check_project_permission() functions.
-- 
-- The RLS policies already allow direct queries:
-- - user_roles_select_base_members: any base member can view roles in that base
-- - user_roles_select_partner_members: any partner org member can view roles in that partner org
-- - user_roles_select_project_members: any project member can view roles in that project
-- - users_select_base_members, users_select_project_members: members can view other members
--
-- Frontend code has been updated to use direct queries instead of these RPC functions.
-- ============================================================================
-- DROP RPC FUNCTIONS
-- ============================================================================
DROP FUNCTION if EXISTS public.get_partner_org_members (UUID);


DROP FUNCTION if EXISTS public.get_project_members (UUID);


DROP FUNCTION if EXISTS public.get_base_members (UUID);

-- Update RLS policies for bases and partner_orgs to use is_public + has_permission
-- Migration: 20251226000030_update_bases_partner_orgs_rls.sql
-- This migration updates SELECT policies to restrict public access based on is_public flag
-- ============================================================================
-- ============================================================================
-- BASES TABLE - Update SELECT policy
-- ============================================================================
DROP POLICY if EXISTS bases_select_public ON public.bases;


CREATE POLICY bases_select_public_or_has_permission ON public.bases FOR
SELECT
  USING (
    is_public = TRUE
    OR public.has_permission (
      auth.uid (),
      'base.read'::permission_key,
      'base'::resource_type,
      id
    )
  );


comment ON policy bases_select_public_or_has_permission ON public.bases IS 'Allows users to view bases that are public OR bases where they have base.read permission';


-- ============================================================================
-- PARTNER_ORGS TABLE - Update SELECT policy
-- ============================================================================
DROP POLICY if EXISTS partner_orgs_select_public ON public.partner_orgs;


CREATE POLICY partner_orgs_select_public_or_has_permission ON public.partner_orgs FOR
SELECT
  USING (
    is_public = TRUE
    OR public.has_permission (
      auth.uid (),
      'partner.read'::permission_key,
      'partner'::resource_type,
      id
    )
  );


comment ON policy partner_orgs_select_public_or_has_permission ON public.partner_orgs IS 'Allows users to view partner orgs that are public OR partner orgs where they have partner.read permission';

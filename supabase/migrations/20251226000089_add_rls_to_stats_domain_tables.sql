-- Add RLS policies to statistics domain tables
-- Migration: 20251226000059_add_rls_to_stats_domain_tables.sql
-- Adds RLS policies to override tables and cache tables
BEGIN;


-- ============================================================================
-- BIBLE_TRANSLATION_OVERRIDES
-- ============================================================================
ALTER TABLE bible_translation_overrides enable ROW level security;


-- Public read (overrides are public information)
DROP POLICY if EXISTS bible_translation_overrides_select_public ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_select_public ON bible_translation_overrides FOR
SELECT
  USING (TRUE);


-- Insert: System admin only
DROP POLICY if EXISTS bible_translation_overrides_insert_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_insert_admin ON bible_translation_overrides FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- Update: System admin only
DROP POLICY if EXISTS bible_translation_overrides_update_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_update_admin ON bible_translation_overrides
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- Delete: System admin only
DROP POLICY if EXISTS bible_translation_overrides_delete_admin ON bible_translation_overrides;


CREATE POLICY bible_translation_overrides_delete_admin ON bible_translation_overrides FOR delete USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- ============================================================================
-- EXTERNAL_PROJECTS_OVERRIDES
-- ============================================================================
ALTER TABLE external_projects_overrides enable ROW level security;


-- Public read (overrides are public information)
DROP POLICY if EXISTS external_projects_overrides_select_public ON external_projects_overrides;


CREATE POLICY external_projects_overrides_select_public ON external_projects_overrides FOR
SELECT
  USING (TRUE);


-- Insert: System admin only
DROP POLICY if EXISTS external_projects_overrides_insert_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_insert_admin ON external_projects_overrides FOR insert
WITH
  CHECK (
    created_by = auth.uid ()
    AND public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- Update: System admin only
DROP POLICY if EXISTS external_projects_overrides_update_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_update_admin ON external_projects_overrides
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- Delete: System admin only
DROP POLICY if EXISTS external_projects_overrides_delete_admin ON external_projects_overrides;


CREATE POLICY external_projects_overrides_delete_admin ON external_projects_overrides FOR delete USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);


-- ============================================================================
-- GRN_COORDINATES_UNMATCHED
-- ============================================================================
-- Enable RLS but no policies (service_role only by default)
ALTER TABLE grn_coordinates_unmatched enable ROW level security;


-- ============================================================================
-- CACHE TABLES - Public read only
-- ============================================================================
-- grn_language_cache
ALTER TABLE grn_language_cache enable ROW level security;


DROP POLICY if EXISTS grn_language_cache_select_public ON grn_language_cache;


CREATE POLICY grn_language_cache_select_public ON grn_language_cache FOR
SELECT
  USING (TRUE);


-- grn_language_coordinates_cache
ALTER TABLE grn_language_coordinates_cache enable ROW level security;


DROP POLICY if EXISTS grn_language_coordinates_cache_select_public ON grn_language_coordinates_cache;


CREATE POLICY grn_language_coordinates_cache_select_public ON grn_language_coordinates_cache FOR
SELECT
  USING (TRUE);


-- jp_countries_cache
ALTER TABLE jp_countries_cache enable ROW level security;


DROP POLICY if EXISTS jp_countries_cache_select_public ON jp_countries_cache;


CREATE POLICY jp_countries_cache_select_public ON jp_countries_cache FOR
SELECT
  USING (TRUE);


-- jp_language_cache
ALTER TABLE jp_language_cache enable ROW level security;


DROP POLICY if EXISTS jp_language_cache_select_public ON jp_language_cache;


CREATE POLICY jp_language_cache_select_public ON jp_language_cache FOR
SELECT
  USING (TRUE);


-- jp_people_groups_cache
ALTER TABLE jp_people_groups_cache enable ROW level security;


DROP POLICY if EXISTS jp_people_groups_cache_select_public ON jp_people_groups_cache;


CREATE POLICY jp_people_groups_cache_select_public ON jp_people_groups_cache FOR
SELECT
  USING (TRUE);


COMMIT;

-- Drop redundant tables and views as part of schema cleanup
-- Phase 1: Drop unused tables/views
-- Phase 2: Drop replaced views and rename views
BEGIN;


-- Phase 1: Drop audio_files_verses table (legacy, replaced by media_files_verses)
-- This table has no dependencies and is not used in code
DROP TABLE IF EXISTS public.audio_files_verses cascade;


-- Phase 1: Drop vw_country_language_listens_heatmap view (unused in code)
-- Only appears in type definitions and documentation
DROP VIEW if EXISTS public.vw_country_language_listens_heatmap cascade;


-- Phase 2: Drop vw_partner_org_language_entities_via_donations view
-- Replaced by partner_org_projects_via_donations (which includes language_entity_id)
-- Usage has been migrated to use partner_org_projects_via_donations instead
DROP VIEW if EXISTS public.vw_partner_org_language_entities_via_donations cascade;


-- Phase 2: Rename vw_partner_org_projects_via_donations to partner_org_projects_via_donations
-- Removing vw_ prefix to follow naming convention (views don't need vw_ prefix)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'vw_partner_org_projects_via_donations'
  ) THEN
    ALTER VIEW public.vw_partner_org_projects_via_donations 
      RENAME TO partner_org_projects_via_donations;
  END IF;
END $$;


-- Phase 3: Drop language listens stats views (feature removed from app)
-- mv_language_listens_stats is only used by application code, no database dependencies
DROP MATERIALIZED VIEW IF EXISTS public.mv_language_listens_stats cascade;


-- vw_language_listens_stats is only used by mv_language_listens_stats (which we're dropping)
DROP VIEW if EXISTS public.vw_language_listens_stats cascade;


COMMIT;

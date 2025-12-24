-- Add Missing RLS Policies for Language Entity Tables
-- This migration adds INSERT and UPDATE policies that were missing from the remote database
-- These policies allow system admins to create and update language entities and related data
-- ============================================================================
-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITIES
-- ----------------------------------------------------------------------------
-- Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entities' 
    AND policyname = 'System admins can insert language_entities'
  ) THEN
    CREATE POLICY "System admins can insert language_entities" ON language_entities 
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- Add UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entities' 
    AND policyname = 'System admins can update language_entities'
  ) THEN
    CREATE POLICY "System admins can update language_entities" ON language_entities
    FOR UPDATE
    TO authenticated 
    USING (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    )
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITY_SOURCES
-- ----------------------------------------------------------------------------
-- Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entity_sources' 
    AND policyname = 'System admins can insert language_entity_sources'
  ) THEN
    CREATE POLICY "System admins can insert language_entity_sources" ON language_entity_sources 
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- Add UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entity_sources' 
    AND policyname = 'System admins can update language_entity_sources'
  ) THEN
    CREATE POLICY "System admins can update language_entity_sources" ON language_entity_sources
    FOR UPDATE
    TO authenticated 
    USING (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    )
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- LANGUAGE_ALIASES
-- ----------------------------------------------------------------------------
-- Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_aliases' 
    AND policyname = 'System admins can insert language_aliases'
  ) THEN
    CREATE POLICY "System admins can insert language_aliases" ON language_aliases 
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- Add UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_aliases' 
    AND policyname = 'System admins can update language_aliases'
  ) THEN
    CREATE POLICY "System admins can update language_aliases" ON language_aliases
    FOR UPDATE
    TO authenticated 
    USING (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    )
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- LANGUAGE_PROPERTIES
-- ----------------------------------------------------------------------------
-- Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_properties' 
    AND policyname = 'System admins can insert language_properties'
  ) THEN
    CREATE POLICY "System admins can insert language_properties" ON language_properties 
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- Add UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_properties' 
    AND policyname = 'System admins can update language_properties'
  ) THEN
    CREATE POLICY "System admins can update language_properties" ON language_properties
    FOR UPDATE
    TO authenticated 
    USING (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    )
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITIES_REGIONS (Junction table)
-- ----------------------------------------------------------------------------
-- Add INSERT policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entities_regions' 
    AND policyname = 'System admins can insert language_entities_regions'
  ) THEN
    CREATE POLICY "System admins can insert language_entities_regions" ON language_entities_regions 
    FOR INSERT TO authenticated
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- Add UPDATE policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'language_entities_regions' 
    AND policyname = 'System admins can update language_entities_regions'
  ) THEN
    CREATE POLICY "System admins can update language_entities_regions" ON language_entities_regions
    FOR UPDATE
    TO authenticated 
    USING (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    )
    WITH CHECK (
      public.has_permission(auth.uid(), 'system.admin', 'global', NULL::UUID)
    );
  END IF;
END $$;


-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration adds the missing INSERT and UPDATE RLS policies for:
-- - language_entities
-- - language_entity_sources
-- - language_aliases
-- - language_properties
-- - language_entities_regions
--
-- These policies were defined in migration 20251105000000_fix_ref_table_rls_policies.sql
-- but were missing from the remote database. This migration uses DO blocks with
-- conditional checks to safely add them only if they don't already exist.
-- ============================================================================

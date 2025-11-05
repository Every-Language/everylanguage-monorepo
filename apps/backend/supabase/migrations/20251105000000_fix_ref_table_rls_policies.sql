-- Fix RLS Policies for Reference Tables
-- This migration standardizes RLS policies for all reference tables:
-- 1. All users can read (public data)
-- 2. Only system_admins can INSERT/UPDATE (using has_permission)
-- 3. No DELETE policies (soft deletes only)
-- 4. Drop version tables (language_entity_versions, region_versions)
-- ============================================================================
-- ============================================================================
-- STEP 1: Drop existing policies for all reference tables
-- ============================================================================
-- Language entities
DROP POLICY if EXISTS "Allow read access to language entities" ON language_entities;


DROP POLICY if EXISTS "Users can view language_entities" ON language_entities;


DROP POLICY if EXISTS "Admins can insert language_entities" ON language_entities;


DROP POLICY if EXISTS "Admins can update language_entities" ON language_entities;


-- Language entities regions junction
DROP POLICY if EXISTS "Allow read access to language entities regions" ON language_entities_regions;


DROP POLICY if EXISTS "Users can view language_entities_regions" ON language_entities_regions;


DROP POLICY if EXISTS "Consolidated view language_entities_regions" ON language_entities_regions;


DROP POLICY if EXISTS "Authenticated users can insert language_entities_regions" ON language_entities_regions;


DROP POLICY if EXISTS "Users can insert their own language_entities_regions" ON language_entities_regions;


-- Language aliases
DROP POLICY if EXISTS "All users can view language_aliases" ON language_aliases;


DROP POLICY if EXISTS "Authenticated users can insert language_aliases" ON language_aliases;


DROP POLICY if EXISTS "Users can insert their own language_aliases" ON language_aliases;


-- Language properties
DROP POLICY if EXISTS "All users can view language_properties" ON language_properties;


DROP POLICY if EXISTS "Authenticated users can insert language_properties" ON language_properties;


DROP POLICY if EXISTS "Users can insert their own language_properties" ON language_properties;


-- Language entity sources
DROP POLICY if EXISTS "All users can view language_entity_sources" ON language_entity_sources;


DROP POLICY if EXISTS "Authenticated users can insert language_entity_sources" ON language_entity_sources;


DROP POLICY if EXISTS "Users can insert their own language_entity_sources" ON language_entity_sources;


-- Regions
DROP POLICY if EXISTS "Allow read access to regions" ON regions;


DROP POLICY if EXISTS "Users can view regions" ON regions;


DROP POLICY if EXISTS "All users can view regions" ON regions;


DROP POLICY if EXISTS "Consolidated view regions" ON regions;


DROP POLICY if EXISTS "Authenticated users can insert regions" ON regions;


DROP POLICY if EXISTS "Users can insert their own regions" ON regions;


-- Region aliases
DROP POLICY if EXISTS "All users can view region_aliases" ON region_aliases;


DROP POLICY if EXISTS "Authenticated users can insert region_aliases" ON region_aliases;


DROP POLICY if EXISTS "Users can insert their own region_aliases" ON region_aliases;


-- Region properties
DROP POLICY if EXISTS "All users can view region_properties" ON region_properties;


DROP POLICY if EXISTS "Authenticated users can insert region_properties" ON region_properties;


DROP POLICY if EXISTS "Users can insert their own region_properties" ON region_properties;


-- Region sources
DROP POLICY if EXISTS "All users can view region_sources" ON region_sources;


DROP POLICY if EXISTS "Authenticated users can insert region_sources" ON region_sources;


DROP POLICY if EXISTS "Users can insert their own region_sources" ON region_sources;


-- ============================================================================
-- STEP 2: Create new standardized policies
-- ============================================================================
-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to language_entities" ON language_entities FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert language_entities" ON language_entities FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update language_entities" ON language_entities
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITIES_REGIONS (Junction table)
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to language_entities_regions" ON language_entities_regions FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert language_entities_regions" ON language_entities_regions FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update language_entities_regions" ON language_entities_regions
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- LANGUAGE_ALIASES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to language_aliases" ON language_aliases FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert language_aliases" ON language_aliases FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update language_aliases" ON language_aliases
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- LANGUAGE_PROPERTIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to language_properties" ON language_properties FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert language_properties" ON language_properties FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update language_properties" ON language_properties
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- LANGUAGE_ENTITY_SOURCES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to language_entity_sources" ON language_entity_sources FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert language_entity_sources" ON language_entity_sources FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update language_entity_sources" ON language_entity_sources
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- REGIONS
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to regions" ON regions FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert regions" ON regions FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update regions" ON regions
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- REGION_ALIASES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to region_aliases" ON region_aliases FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert region_aliases" ON region_aliases FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update region_aliases" ON region_aliases
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- REGION_PROPERTIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to region_properties" ON region_properties FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert region_properties" ON region_properties FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update region_properties" ON region_properties
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ----------------------------------------------------------------------------
-- REGION_SOURCES
-- ----------------------------------------------------------------------------
CREATE POLICY "Public read access to region_sources" ON region_sources FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "System admins can insert region_sources" ON region_sources FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update region_sources" ON region_sources
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- ============================================================================
-- STEP 3: Drop version tables and related policies
-- ============================================================================
-- Drop policies first
DROP POLICY if EXISTS "Users can view region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can insert region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can update own region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can delete own region_versions" ON region_versions;


DROP POLICY if EXISTS "Authenticated users can insert region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can view their own region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can update their own region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can delete their own region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can insert their own region_versions" ON region_versions;


DROP POLICY if EXISTS "Users can view language_entity_versions" ON language_entity_versions;


DROP POLICY if EXISTS "Users can insert language_entity_versions" ON language_entity_versions;


DROP POLICY if EXISTS "Authenticated users can insert language_entity_versions" ON language_entity_versions;


DROP POLICY if EXISTS "Users can insert their own language_entity_versions" ON language_entity_versions;


-- Drop foreign key constraints that reference version tables
ALTER TABLE IF EXISTS language_entity_versions
DROP CONSTRAINT if EXISTS language_entity_versions_language_entity_id_fkey;


ALTER TABLE IF EXISTS language_entity_versions
DROP CONSTRAINT if EXISTS language_entity_versions_changed_by_fkey;


ALTER TABLE IF EXISTS region_versions
DROP CONSTRAINT if EXISTS region_versions_region_id_fkey;


ALTER TABLE IF EXISTS region_versions
DROP CONSTRAINT if EXISTS region_versions_changed_by_fkey;


-- Drop the version tables
DROP TABLE IF EXISTS language_entity_versions cascade;


DROP TABLE IF EXISTS region_versions cascade;


-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================
comment ON policy "Public read access to language_entities" ON language_entities IS 'All users (including unauthenticated) can read non-deleted language entities';


comment ON policy "System admins can insert language_entities" ON language_entities IS 'Only users with system.admin permission can insert new language entities';


comment ON policy "System admins can update language_entities" ON language_entities IS 'Only users with system.admin permission can update language entities';


comment ON policy "Public read access to regions" ON regions IS 'All users (including unauthenticated) can read non-deleted regions';


comment ON policy "System admins can insert regions" ON regions IS 'Only users with system.admin permission can insert new regions';


comment ON policy "System admins can update regions" ON regions IS 'Only users with system.admin permission can update regions';


-- ============================================================================
-- NOTES
-- ============================================================================
-- This migration:
-- 1. Standardizes all RLS policies for reference tables
-- 2. Makes all reference data publicly readable (not sensitive)
-- 3. Restricts INSERT/UPDATE to system admins only (using has_permission)
-- 4. Removes DELETE policies entirely (soft deletes only)
-- 5. Drops version tracking tables (to be reimplemented later)
-- 
-- Reference tables covered:
-- - language_entities, language_aliases, language_properties, language_entity_sources
-- - regions, region_aliases, region_properties, region_sources  
-- - language_entities_regions (junction table)
-- ============================================================================

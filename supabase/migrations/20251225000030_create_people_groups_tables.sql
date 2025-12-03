-- 20251226000001_create_people_groups_tables.sql
-- Create people groups tables following language_entities/regions pattern
BEGIN;


-- ============================================================================
-- CORE TABLES
-- ============================================================================
-- People groups table (concept-level - PGAC)
CREATE TABLE people_groups (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  parent_id UUID REFERENCES people_groups (id) ON DELETE SET NULL,
  people_id3 INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  population_pgac INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);


-- People groups sources table
CREATE TABLE people_groups_sources (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  people_group_id UUID REFERENCES people_groups (id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL,
  version TEXT,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  external_id_type TEXT,
  external_id TEXT,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT check_people_group_source_reference CHECK (
    (
      is_external = TRUE
      AND external_id IS NOT NULL
    )
    OR (
      is_external = FALSE
      AND created_by IS NOT NULL
    )
  )
);


-- People groups properties table
CREATE TABLE people_groups_properties (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  people_group_id UUID REFERENCES people_groups (id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (people_group_id, key)
);


-- People groups regions table (instance-level - PGIC)
CREATE TABLE people_groups_regions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  people_group_id UUID REFERENCES people_groups (id) ON DELETE CASCADE NOT NULL,
  region_id UUID REFERENCES regions (id) ON DELETE CASCADE NOT NULL,
  people_id3_rog3 TEXT UNIQUE NOT NULL,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  location_point geometry (point, 4326),
  population INTEGER,
  peop_name_in_country TEXT,
  primary_language_rol3 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (people_group_id, region_id)
);


-- Language entities people groups regions junction table
CREATE TABLE language_entities_people_groups_regions (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  people_group_region_id UUID REFERENCES people_groups_regions (id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (language_entity_id, people_group_region_id)
);


-- ============================================================================
-- INDEXES
-- ============================================================================
-- People groups indexes
CREATE INDEX idx_people_groups_parent_id ON people_groups (parent_id);


CREATE INDEX idx_people_groups_people_id3 ON people_groups (people_id3);


CREATE INDEX idx_people_groups_name ON people_groups (name);


CREATE INDEX idx_people_groups_deleted_at ON people_groups (deleted_at);


-- People groups sources indexes
CREATE INDEX idx_people_groups_sources_group_id ON people_groups_sources (people_group_id);


CREATE INDEX idx_people_groups_sources_external_id_type ON people_groups_sources (external_id_type);


CREATE INDEX idx_people_groups_sources_external_id ON people_groups_sources (external_id);


-- People groups properties indexes
CREATE INDEX idx_people_groups_properties_group_id ON people_groups_properties (people_group_id);


CREATE INDEX idx_people_groups_properties_key ON people_groups_properties (key);


-- People groups regions indexes
CREATE INDEX idx_people_groups_regions_group_id ON people_groups_regions (people_group_id);


CREATE INDEX idx_people_groups_regions_region_id ON people_groups_regions (region_id);


CREATE INDEX idx_people_groups_regions_people_id3_rog3 ON people_groups_regions (people_id3_rog3);


CREATE INDEX idx_people_groups_regions_location ON people_groups_regions USING gist (location_point);


CREATE INDEX idx_people_groups_regions_deleted_at ON people_groups_regions (deleted_at);


-- Language entities people groups regions indexes
CREATE INDEX idx_language_entities_people_groups_regions_language_id ON language_entities_people_groups_regions (language_entity_id);


CREATE INDEX idx_language_entities_people_groups_regions_pgr_id ON language_entities_people_groups_regions (people_group_region_id);


-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_people_groups_updated_at before
UPDATE ON people_groups FOR each ROW
EXECUTE function update_updated_at_column ();


CREATE TRIGGER update_people_groups_regions_updated_at before
UPDATE ON people_groups_regions FOR each ROW
EXECUTE function update_updated_at_column ();


-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE people_groups enable ROW level security;


ALTER TABLE people_groups_sources enable ROW level security;


ALTER TABLE people_groups_properties enable ROW level security;


ALTER TABLE people_groups_regions enable ROW level security;


ALTER TABLE language_entities_people_groups_regions enable ROW level security;


-- Public read access
CREATE POLICY "Public read access to people_groups" ON people_groups FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "Public read access to people_groups_sources" ON people_groups_sources FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "Public read access to people_groups_properties" ON people_groups_properties FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "Public read access to people_groups_regions" ON people_groups_regions FOR
SELECT
  TO public USING (deleted_at IS NULL);


CREATE POLICY "Public read access to language_entities_people_groups_regions" ON language_entities_people_groups_regions FOR
SELECT
  TO public;


-- System admins insert/update
CREATE POLICY "System admins can insert people_groups" ON people_groups FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update people_groups" ON people_groups
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can insert people_groups_sources" ON people_groups_sources FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update people_groups_sources" ON people_groups_sources
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can insert people_groups_properties" ON people_groups_properties FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update people_groups_properties" ON people_groups_properties
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can insert people_groups_regions" ON people_groups_regions FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can update people_groups_regions" ON people_groups_regions
FOR UPDATE
  TO authenticated USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


CREATE POLICY "System admins can insert lang_entities_pg_regions" ON language_entities_people_groups_regions FOR insert TO authenticated
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


COMMIT;

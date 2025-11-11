-- Refactor Funding Status Architecture
-- This migration moves funding status from language_entities and regions tables
-- to a dedicated language_funding table and region_funding view.
-- This separates reference data from funding business logic.
-- ============================================================================
-- 1. CREATE LANGUAGE_FUNDING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS language_funding (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  language_entity_id UUID REFERENCES language_entities (id) ON DELETE CASCADE NOT NULL,
  funding_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    funding_status IN (
      'draft',
      'available',
      'in_progress',
      'funded',
      'archived'
    )
  ),
  budget_cents INTEGER CHECK (
    budget_cents IS NULL
    OR budget_cents > 0
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  -- Ensure one funding record per language
  UNIQUE (language_entity_id)
);


-- Indexes
CREATE INDEX if NOT EXISTS idx_language_funding_language_entity_id ON language_funding (language_entity_id);


CREATE INDEX if NOT EXISTS idx_language_funding_status ON language_funding (funding_status)
WHERE
  deleted_at IS NULL;


CREATE INDEX if NOT EXISTS idx_language_funding_deleted_at ON language_funding (deleted_at)
WHERE
  deleted_at IS NULL;


-- Comments
comment ON TABLE language_funding IS 'Tracks funding status and budget for languages. Separates funding business logic from reference data.';


comment ON COLUMN language_funding.funding_status IS 'draft: no budget set, available: budget set but no donations, in_progress: has donations < budget, funded: donations >= budget, archived: manually archived';


comment ON COLUMN language_funding.budget_cents IS 'Total budget required to fully fund this language in cents. NULL means budget not yet set.';


-- ============================================================================
-- 2. CREATE FUNCTION TO CALCULATE LANGUAGE FUNDING STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_language_funding_status (language_id UUID) returns TEXT language plpgsql stable AS $$
DECLARE
  v_budget_cents INTEGER;
  v_current_status TEXT;
  v_total_intents_cents BIGINT;
BEGIN
  -- Get current budget and status
  SELECT budget_cents, funding_status INTO v_budget_cents, v_current_status
  FROM language_funding
  WHERE language_entity_id = language_id
    AND deleted_at IS NULL;
  
  -- If no funding record exists, return NULL (not tracked)
  IF v_budget_cents IS NULL AND v_current_status IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If archived, preserve manual status
  IF v_current_status = 'archived' THEN
    RETURN 'archived';
  END IF;
  
  -- If budget not set, return draft
  IF v_budget_cents IS NULL THEN
    RETURN 'draft';
  END IF;
  
  -- Calculate total donation intents for this language
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_intents_cents
  FROM donations
  WHERE intent_language_entity_id = language_id
    AND status = 'completed'
    AND deleted_at IS NULL;
  
  -- Determine status based on budget and intents
  IF v_total_intents_cents = 0 THEN
    RETURN 'available';
  ELSIF v_total_intents_cents < v_budget_cents THEN
    RETURN 'in_progress';
  ELSE
    RETURN 'funded';
  END IF;
END;
$$;


comment ON function calculate_language_funding_status IS 'Calculates the funding status for a language based on budget and donation intents. Preserves archived status.';


-- ============================================================================
-- 3. CREATE TRIGGER TO AUTO-UPDATE LANGUAGE FUNDING STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_language_funding_status_on_donation () returns trigger language plpgsql security definer AS $$
DECLARE
  affected_language_id UUID;
  new_status TEXT;
BEGIN
  -- Determine which language was affected
  IF TG_OP = 'DELETE' THEN
    affected_language_id := OLD.intent_language_entity_id;
  ELSE
    affected_language_id := NEW.intent_language_entity_id;
  END IF;
  
  -- Only process if donation intent targets a language and status is completed
  IF affected_language_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP != 'DELETE' AND NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Recalculate status for affected language
  new_status := calculate_language_funding_status(affected_language_id);
  
  -- Update language_funding if record exists and not archived
  IF new_status IS NOT NULL THEN
    UPDATE language_funding
    SET funding_status = new_status,
        updated_at = NOW()
    WHERE language_entity_id = affected_language_id
      AND deleted_at IS NULL
      AND funding_status != 'archived'; -- Preserve manual archived status
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


comment ON function update_language_funding_status_on_donation IS 'Trigger function to automatically update language funding status when donations change.';


-- Create trigger
DROP TRIGGER if EXISTS trg_update_language_funding_status ON donations;


CREATE TRIGGER trg_update_language_funding_status
AFTER insert
OR
UPDATE
OR delete ON donations FOR each ROW
EXECUTE function update_language_funding_status_on_donation ();


-- ============================================================================
-- 4. CREATE REGION_FUNDING_OVERRIDES TABLE (for archived status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS region_funding_overrides (
  region_id UUID PRIMARY KEY REFERENCES regions (id) ON DELETE CASCADE,
  funding_status TEXT NOT NULL DEFAULT 'archived' CHECK (funding_status = 'archived'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL
);


comment ON TABLE region_funding_overrides IS 'Allows manual override of region funding status to archived. Used by region_funding view.';


-- ============================================================================
-- 5. CREATE REGION_FUNDING VIEW
-- ============================================================================
CREATE OR REPLACE VIEW region_funding AS
WITH
  -- Get all languages directly linked to region
  direct_languages AS (
    SELECT DISTINCT
      ler.region_id,
      ler.language_entity_id
    FROM
      language_entities_regions ler
    WHERE
      ler.deleted_at IS NULL
  ),
  -- Get all descendant regions for each region
  region_descendants AS (
    SELECT DISTINCT
      r.id AS region_id,
      h.hierarchy_region_id AS descendant_region_id
    FROM
      regions r
      CROSS JOIN LATERAL get_region_hierarchy (r.id, 0, 10) h
    WHERE
      r.deleted_at IS NULL
      AND h.relationship_type IN ('self', 'descendant')
  ),
  -- Get languages from descendant regions
  descendant_region_languages AS (
    SELECT DISTINCT
      rd.region_id,
      ler.language_entity_id
    FROM
      region_descendants rd
      JOIN language_entities_regions ler ON ler.region_id = rd.descendant_region_id
    WHERE
      ler.deleted_at IS NULL
  ),
  -- Get descendant languages of all linked languages
  language_descendants AS (
    SELECT DISTINCT
      dl.region_id,
      h.hierarchy_entity_id AS descendant_language_id
    FROM
      direct_languages dl
      CROSS JOIN LATERAL get_language_entity_hierarchy (dl.language_entity_id, 0, 10) h
    WHERE
      h.relationship_type IN ('self', 'descendant')
  ),
  -- Combine all languages linked to region (direct + descendant regions + descendant languages)
  all_region_languages AS (
    SELECT
      region_id,
      language_entity_id
    FROM
      direct_languages
    UNION
    SELECT
      region_id,
      language_entity_id
    FROM
      descendant_region_languages
    UNION
    SELECT
      region_id,
      descendant_language_id AS language_entity_id
    FROM
      language_descendants
  ),
  -- Aggregate language funding data
  language_funding_agg AS (
    SELECT
      arl.region_id,
      COUNT(lf.id) FILTER (
        WHERE
          lf.deleted_at IS NULL
      ) AS language_funding_count,
      SUM(lf.budget_cents) FILTER (
        WHERE
          lf.deleted_at IS NULL
      ) AS total_budget_cents,
      COUNT(lf.id) FILTER (
        WHERE
          lf.funding_status = 'funded'
          AND lf.deleted_at IS NULL
      ) AS funded_count,
      COUNT(lf.id) FILTER (
        WHERE
          lf.funding_status = 'archived'
          AND lf.deleted_at IS NULL
      ) AS archived_count,
      -- Collect all language IDs for this region
      ARRAY_AGG(DISTINCT arl.language_entity_id) FILTER (
        WHERE
          arl.language_entity_id IS NOT NULL
      ) AS language_ids
    FROM
      all_region_languages arl
      LEFT JOIN language_funding lf ON lf.language_entity_id = arl.language_entity_id
    GROUP BY
      arl.region_id
  ),
  -- Check if any linked language has donation intents
  language_intents_check AS (
    SELECT
      lfa.region_id,
      EXISTS (
        SELECT
          1
        FROM
          donations d
        WHERE
          d.intent_language_entity_id = ANY (lfa.language_ids)
          AND d.status = 'completed'
          AND d.deleted_at IS NULL
      ) AS has_language_intents
    FROM
      language_funding_agg lfa
    WHERE
      lfa.language_ids IS NOT NULL
  ),
  -- Check if any linked language has allocations via projects
  language_allocations_check AS (
    SELECT
      lfa.region_id,
      EXISTS (
        SELECT
          1
        FROM
          donation_allocations da
          JOIN projects p ON p.id = da.project_id
        WHERE
          p.target_language_entity_id = ANY (lfa.language_ids)
          AND p.deleted_at IS NULL
      ) AS has_language_allocations
    FROM
      language_funding_agg lfa
    WHERE
      lfa.language_ids IS NOT NULL
  ),
  -- Check region donation intents
  region_intents AS (
    SELECT
      r.id AS region_id,
      EXISTS (
        SELECT
          1
        FROM
          donations d
        WHERE
          d.intent_region_id = r.id
          AND d.status = 'completed'
          AND d.deleted_at IS NULL
      ) AS has_region_intents
    FROM
      regions r
    WHERE
      r.deleted_at IS NULL
  )
SELECT
  r.id AS region_id,
  r.name AS region_name,
  r.level AS region_level,
  COALESCE(lfa.total_budget_cents, 0) AS budget_cents,
  CASE
  -- Check for manual override first
    WHEN rfo.funding_status = 'archived' THEN 'archived'
    -- No language funding rows exist
    WHEN COALESCE(lfa.language_funding_count, 0) = 0 THEN 'not_started'
    -- All languages are archived
    WHEN lfa.language_funding_count > 0
    AND lfa.archived_count = lfa.language_funding_count THEN 'archived'
    -- All languages are funded
    WHEN lfa.language_funding_count > 0
    AND lfa.funded_count = lfa.language_funding_count THEN 'funded'
    -- Has intents or allocations (region or language level)
    WHEN COALESCE(ri.has_region_intents, FALSE)
    OR COALESCE(lic.has_language_intents, FALSE)
    OR COALESCE(lac.has_language_allocations, FALSE) THEN 'in_progress'
    -- At least one language funding row exists
    WHEN lfa.language_funding_count > 0 THEN 'available'
    ELSE 'not_started'
  END AS funding_status
FROM
  regions r
  LEFT JOIN language_funding_agg lfa ON lfa.region_id = r.id
  LEFT JOIN region_intents ri ON ri.region_id = r.id
  LEFT JOIN language_intents_check lic ON lic.region_id = r.id
  LEFT JOIN language_allocations_check lac ON lac.region_id = r.id
  LEFT JOIN region_funding_overrides rfo ON rfo.region_id = r.id
WHERE
  r.deleted_at IS NULL;


comment ON view region_funding IS 'Computed view showing funding status and budget for regions based on aggregated language funding data. Includes languages from descendant regions and descendant languages.';


-- ============================================================================
-- 6. MIGRATE EXISTING DATA (if any)
-- ============================================================================
-- Migrate existing funding_status from language_entities to language_funding
INSERT INTO
  language_funding (
    language_entity_id,
    funding_status,
    budget_cents,
    created_at,
    updated_at
  )
SELECT
  id,
  funding_status::TEXT,
  NULL, -- Budget not set in old system
  created_at,
  updated_at
FROM
  language_entities
WHERE
  funding_status IS NOT NULL
  AND deleted_at IS NULL
  AND id NOT IN (
    SELECT
      language_entity_id
    FROM
      language_funding
    WHERE
      deleted_at IS NULL
  )
ON CONFLICT (language_entity_id) DO NOTHING;


-- ============================================================================
-- 7. DROP OLD FUNDING_STATUS COLUMNS
-- ============================================================================
-- Drop triggers that depend on funding_status columns first
DROP TRIGGER if EXISTS trg_update_region_funding_status ON language_entities;


-- Drop indexes first
DROP INDEX if EXISTS idx_language_entities_funding_status;


DROP INDEX if EXISTS idx_regions_funding_status;


-- Drop columns
ALTER TABLE language_entities
DROP COLUMN IF EXISTS funding_status;


ALTER TABLE regions
DROP COLUMN IF EXISTS funding_status;


-- ============================================================================
-- 8. RLS POLICIES FOR LANGUAGE_FUNDING
-- ============================================================================
ALTER TABLE language_funding enable ROW level security;


-- Read: Admins can read all
CREATE POLICY language_funding_read ON language_funding FOR
SELECT
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Insert: Admins can insert
CREATE POLICY language_funding_insert ON language_funding FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Update: Admins can update
CREATE POLICY language_funding_update ON language_funding
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  )
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Delete: Admins can delete (soft delete)
CREATE POLICY language_funding_delete ON language_funding FOR delete USING (
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL
  )
);


-- ============================================================================
-- 9. RLS POLICIES FOR REGION_FUNDING_OVERRIDES
-- ============================================================================
ALTER TABLE region_funding_overrides enable ROW level security;


-- Read: Admins can read all
CREATE POLICY region_funding_overrides_read ON region_funding_overrides FOR
SELECT
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Insert: Admins can insert
CREATE POLICY region_funding_overrides_insert ON region_funding_overrides FOR insert TO authenticated
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Update: Admins can update
CREATE POLICY region_funding_overrides_update ON region_funding_overrides
FOR UPDATE
  USING (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  )
WITH
  CHECK (
    has_permission (
      auth.uid (),
      'system.admin'::permission_key,
      'global'::resource_type,
      NULL
    )
  );


-- Delete: Admins can delete
CREATE POLICY region_funding_overrides_delete ON region_funding_overrides FOR delete USING (
  has_permission (
    auth.uid (),
    'system.admin'::permission_key,
    'global'::resource_type,
    NULL
  )
);


-- ============================================================================
-- 10. UPDATE TRIGGER FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_language_funding_updated_at () returns trigger language plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


CREATE TRIGGER trg_language_funding_updated_at before
UPDATE ON language_funding FOR each ROW
EXECUTE function update_language_funding_updated_at ();


CREATE OR REPLACE FUNCTION update_region_funding_overrides_updated_at () returns trigger language plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


CREATE TRIGGER trg_region_funding_overrides_updated_at before
UPDATE ON region_funding_overrides FOR each ROW
EXECUTE function update_region_funding_overrides_updated_at ();

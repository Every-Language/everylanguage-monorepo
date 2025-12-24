-- Convert partner_orgs_projects VIEW to TABLE
-- Enables both donation-based and manual linking while protecting trigger-created rows
-- Only system.admin can manage entries; donation-sourced rows are always protected
-- ============================================================================
-- PART 1: DROP EXISTING VIEW
-- ============================================================================
DROP VIEW if EXISTS partner_orgs_projects cascade;


-- ============================================================================
-- PART 2: CREATE TABLE STRUCTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.partner_orgs_projects (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  partner_org_id UUID NOT NULL REFERENCES public.partner_orgs (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('donation', 'manual')),
  donation_allocation_id UUID NULL REFERENCES public.donation_allocations (id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES public.users (id) ON DELETE SET NULL
);


-- ============================================================================
-- PART 3: CREATE INDEXES
-- ============================================================================
CREATE INDEX if NOT EXISTS partner_orgs_projects_partner_org_id_idx ON public.partner_orgs_projects (partner_org_id);


CREATE INDEX if NOT EXISTS partner_orgs_projects_project_id_idx ON public.partner_orgs_projects (project_id);


CREATE INDEX if NOT EXISTS partner_orgs_projects_donation_allocation_id_idx ON public.partner_orgs_projects (donation_allocation_id)
WHERE
  donation_allocation_id IS NOT NULL;


CREATE UNIQUE INDEX if NOT EXISTS partner_orgs_projects_active_pair_uniq ON public.partner_orgs_projects (partner_org_id, project_id)
WHERE
  unassigned_at IS NULL;


-- ============================================================================
-- PART 4: CREATE HELPER FUNCTIONS
-- ============================================================================
-- Function to check if any active allocation exists for partner_org + project pair
-- Optionally exclude a specific allocation_id (useful when updating/deleting)
CREATE OR REPLACE FUNCTION public.has_active_allocation (
  p_partner_org_id UUID,
  p_project_id UUID,
  p_exclude_allocation_id UUID DEFAULT NULL
) returns BOOLEAN language plpgsql stable security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.donations d
    JOIN public.donation_allocations da ON da.donation_id = d.id
    WHERE d.partner_org_id = p_partner_org_id
      AND da.project_id = p_project_id
      AND d.deleted_at IS NULL
      AND (da.effective_to IS NULL OR da.effective_to >= current_date)
      AND (p_exclude_allocation_id IS NULL OR da.id != p_exclude_allocation_id)
  );
END;
$$;


comment ON function public.has_active_allocation IS 'Checks if any active allocation exists for the partner_org + project pair';


-- Function to sync partner_orgs_projects from donation_allocations
CREATE OR REPLACE FUNCTION public.sync_partner_orgs_projects_from_allocations () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_partner_org_id UUID;
  v_project_id UUID;
  v_effective_from DATE;
  v_effective_to DATE;
  v_is_active BOOLEAN;
  v_has_other_active BOOLEAN;
BEGIN
  -- Get partner_org_id from donation
  IF TG_OP = 'DELETE' THEN
    SELECT d.partner_org_id INTO v_partner_org_id
    FROM public.donations d
    WHERE d.id = OLD.donation_id;
    v_project_id := OLD.project_id;
    v_effective_from := OLD.effective_from;
    v_effective_to := OLD.effective_to;
  ELSE
    SELECT d.partner_org_id INTO v_partner_org_id
    FROM public.donations d
    WHERE d.id = NEW.donation_id;
    v_project_id := NEW.project_id;
    v_effective_from := NEW.effective_from;
    v_effective_to := NEW.effective_to;
  END IF;

  -- Skip if no partner_org_id or project_id (operation allocations)
  IF v_partner_org_id IS NULL OR v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip if donation is deleted
  IF TG_OP != 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.donations d 
      WHERE d.id = NEW.donation_id AND d.deleted_at IS NOT NULL
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Determine if allocation is active
  v_is_active := (v_effective_to IS NULL OR v_effective_to >= current_date);

  IF TG_OP = 'INSERT' THEN
    -- On INSERT: Create entry if allocation is active
    IF v_is_active THEN
      INSERT INTO public.partner_orgs_projects (
        partner_org_id,
        project_id,
        assigned_at,
        source_type,
        donation_allocation_id
      )
      VALUES (
        v_partner_org_id,
        v_project_id,
        COALESCE(v_effective_from, current_date)::TIMESTAMPTZ,
        'donation',
        NEW.id
      )
      ON CONFLICT (partner_org_id, project_id) 
      WHERE unassigned_at IS NULL
      DO NOTHING;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- On UPDATE: Handle effective_to changes
    IF v_is_active THEN
      -- Allocation is active: ensure entry exists and is not unassigned
      -- Set session variable to allow trigger updates
      PERFORM set_config('app.trigger_update', 'true', true);
      INSERT INTO public.partner_orgs_projects (
        partner_org_id,
        project_id,
        assigned_at,
        source_type,
        donation_allocation_id
      )
      VALUES (
        v_partner_org_id,
        v_project_id,
        COALESCE(v_effective_from, current_date)::TIMESTAMPTZ,
        'donation',
        NEW.id
      )
      ON CONFLICT (partner_org_id, project_id)
      WHERE unassigned_at IS NULL
      DO UPDATE SET
        donation_allocation_id = NEW.id,
        assigned_at = COALESCE(v_effective_from, current_date)::TIMESTAMPTZ;
      PERFORM set_config('app.trigger_update', 'false', true);
      
      -- Also clear unassigned_at if entry exists but is unassigned
      -- Set session variable to allow trigger update
      PERFORM set_config('app.trigger_update', 'true', true);
      UPDATE public.partner_orgs_projects
      SET unassigned_at = NULL,
          donation_allocation_id = NEW.id,
          assigned_at = COALESCE(v_effective_from, current_date)::TIMESTAMPTZ
      WHERE partner_org_id = v_partner_org_id
        AND project_id = v_project_id
        AND unassigned_at IS NOT NULL
        AND source_type = 'donation';
      PERFORM set_config('app.trigger_update', 'false', true);
    ELSE
      -- Allocation is inactive: check if other active allocations exist (exclude current)
      v_has_other_active := public.has_active_allocation(v_partner_org_id, v_project_id, NEW.id);
      
      IF NOT v_has_other_active THEN
        -- No other active allocations: set unassigned_at
        -- Set session variable to allow trigger update
        PERFORM set_config('app.trigger_update', 'true', true);
        UPDATE public.partner_orgs_projects
        SET unassigned_at = NOW()
        WHERE partner_org_id = v_partner_org_id
          AND project_id = v_project_id
          AND unassigned_at IS NULL
          AND source_type = 'donation';
        PERFORM set_config('app.trigger_update', 'false', true);
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- On DELETE: Check if other active allocations exist (exclude current)
    v_has_other_active := public.has_active_allocation(v_partner_org_id, v_project_id, OLD.id);
    
    IF NOT v_has_other_active THEN
      -- No other active allocations: set unassigned_at
      -- Set session variable to allow trigger update
      PERFORM set_config('app.trigger_update', 'true', true);
      UPDATE public.partner_orgs_projects
      SET unassigned_at = NOW()
      WHERE partner_org_id = v_partner_org_id
        AND project_id = v_project_id
        AND unassigned_at IS NULL
        AND source_type = 'donation';
      PERFORM set_config('app.trigger_update', 'false', true);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


comment ON function public.sync_partner_orgs_projects_from_allocations IS 'Syncs partner_orgs_projects table from donation_allocations changes';


-- Function to protect donation-sourced rows from manual updates
CREATE OR REPLACE FUNCTION public.protect_donation_sourced_rows () returns trigger language plpgsql AS $$
BEGIN
  -- If this is a donation-sourced row, block all updates except unassigned_at
  -- (unassigned_at can be set by triggers via session variable)
  IF OLD.source_type = 'donation' THEN
    -- Allow unassigned_at to be set (for trigger cleanup)
    IF OLD.unassigned_at IS NULL AND NEW.unassigned_at IS NOT NULL THEN
      -- Check if this is coming from a trigger (via session variable)
      -- If not, block it
      IF current_setting('app.trigger_update', TRUE) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Cannot manually update donation-sourced partner_orgs_projects entry. Donation entries are managed automatically via donation_allocations.';
      END IF;
    ELSIF OLD.unassigned_at IS DISTINCT FROM NEW.unassigned_at THEN
      -- Unassigned_at change allowed only from triggers
      IF current_setting('app.trigger_update', TRUE) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Cannot manually update donation-sourced partner_orgs_projects entry. Donation entries are managed automatically via donation_allocations.';
      END IF;
    ELSE
      -- Any other update is blocked
      RAISE EXCEPTION 'Cannot manually update donation-sourced partner_orgs_projects entry. Donation entries are managed automatically via donation_allocations.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


comment ON function public.protect_donation_sourced_rows IS 'Protects donation-sourced rows from manual updates';


-- Function to prevent manual inserts that conflict with donation entries
CREATE OR REPLACE FUNCTION public.prevent_manual_conflict_with_donation () returns trigger language plpgsql AS $$
BEGIN
  -- If this is a manual entry, check if donation entry exists
  IF NEW.source_type = 'manual' THEN
    IF EXISTS (
      SELECT 1
      FROM public.partner_orgs_projects pop
      WHERE pop.partner_org_id = NEW.partner_org_id
        AND pop.project_id = NEW.project_id
        AND pop.unassigned_at IS NULL
        AND pop.source_type = 'donation'
    ) THEN
      RAISE EXCEPTION 'Cannot create manual partner_orgs_projects entry when donation-sourced entry exists. Donation entries take precedence.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


comment ON function public.prevent_manual_conflict_with_donation IS 'Prevents manual inserts that conflict with donation entries';


-- ============================================================================
-- PART 5: CREATE TRIGGERS
-- ============================================================================
-- Trigger to sync from donation_allocations
CREATE TRIGGER trigger_sync_partner_orgs_projects_from_allocations
AFTER insert
OR
UPDATE
OR delete ON public.donation_allocations FOR each ROW
EXECUTE function public.sync_partner_orgs_projects_from_allocations ();


-- Trigger to protect donation-sourced rows
CREATE TRIGGER trigger_protect_donation_sourced_rows before
UPDATE ON public.partner_orgs_projects FOR each ROW
EXECUTE function public.protect_donation_sourced_rows ();


-- Trigger to prevent manual conflicts
CREATE TRIGGER trigger_prevent_manual_conflict_with_donation before insert ON public.partner_orgs_projects FOR each ROW
EXECUTE function public.prevent_manual_conflict_with_donation ();


-- ============================================================================
-- PART 6: BACKFILL EXISTING DATA
-- ============================================================================
-- Insert all current active allocations into table
-- Use DISTINCT ON to handle multiple allocations to same project
INSERT INTO
  public.partner_orgs_projects (
    partner_org_id,
    project_id,
    assigned_at,
    source_type,
    donation_allocation_id
  )
SELECT DISTINCT
  ON (po.id, p.id) po.id AS partner_org_id,
  p.id AS project_id,
  COALESCE(da.effective_from, current_date)::TIMESTAMPTZ AS assigned_at,
  'donation' AS source_type,
  da.id AS donation_allocation_id
FROM
  public.partner_orgs po
  JOIN public.donations d ON d.partner_org_id = po.id
  JOIN public.donation_allocations da ON da.donation_id = d.id
  JOIN public.projects p ON p.id = da.project_id
WHERE
  d.deleted_at IS NULL
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
  AND p.deleted_at IS NULL
ORDER BY
  po.id,
  p.id,
  da.effective_from DESC
ON CONFLICT (partner_org_id, project_id)
WHERE
  unassigned_at IS NULL DO NOTHING;


-- ============================================================================
-- PART 7: ENABLE RLS
-- ============================================================================
ALTER TABLE public.partner_orgs_projects enable ROW level security;


-- ============================================================================
-- PART 8: CREATE RLS POLICIES
-- ============================================================================
-- SELECT: Public read (exists checks like bases_projects)
CREATE POLICY partner_orgs_projects_select_public ON public.partner_orgs_projects FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        public.partner_orgs po
      WHERE
        po.id = partner_orgs_projects.partner_org_id
    )
    AND EXISTS (
      SELECT
        1
      FROM
        public.projects p
      WHERE
        p.id = partner_orgs_projects.project_id
    )
  );


-- INSERT: Only system.admin
CREATE POLICY partner_orgs_projects_insert_admin ON public.partner_orgs_projects FOR insert
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- UPDATE: Only system.admin
CREATE POLICY partner_orgs_projects_update_admin ON public.partner_orgs_projects
FOR UPDATE
  USING (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  )
WITH
  CHECK (
    public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
  );


-- DELETE: Only system.admin
CREATE POLICY partner_orgs_projects_delete_admin ON public.partner_orgs_projects FOR delete USING (
  public.has_permission (auth.uid (), 'system.admin', 'global', NULL::UUID)
);

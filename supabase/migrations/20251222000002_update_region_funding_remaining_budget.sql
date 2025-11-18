-- Update Region Funding View to Include Remaining Budget
-- Modifies region_funding view to calculate remaining budget using language remaining budgets
-- and subtracting region/language donations
-- ============================================================================
-- UPDATE REGION_FUNDING VIEW
-- ============================================================================
-- Drop the view first to allow changing column structure (adding remaining_budget_cents)
-- CASCADE will drop dependent objects (like materialized views) that depend on this view
DROP VIEW if EXISTS region_funding cascade;


CREATE VIEW region_funding AS
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
  -- Aggregate language funding data (using original budget_cents for backward compatibility)
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
  -- Calculate remaining budget from language_funding_remaining
  language_remaining_budget_agg AS (
    SELECT
      arl.region_id,
      COALESCE(SUM(lfr.remaining_budget_cents), 0) AS total_remaining_budget_cents
    FROM
      all_region_languages arl
      LEFT JOIN language_funding_remaining lfr ON lfr.language_entity_id = arl.language_entity_id
    GROUP BY
      arl.region_id
  ),
  -- Sum donations with intent to languages in this region
  -- Note: These are already subtracted in language_funding_remaining, but user requested
  -- to subtract them again at the region level for independent region calculation
  language_donations_sum AS (
    SELECT
      lfa.region_id,
      COALESCE(SUM(d.amount_cents), 0) AS total_language_donations_cents
    FROM
      language_funding_agg lfa
      LEFT JOIN donations d ON d.intent_language_entity_id = ANY (lfa.language_ids)
      AND d.status = 'completed'
      AND d.deleted_at IS NULL
    WHERE
      lfa.language_ids IS NOT NULL
    GROUP BY
      lfa.region_id
  ),
  -- Sum donations with intent to the region itself
  region_donations_sum AS (
    SELECT
      r.id AS region_id,
      COALESCE(SUM(d.amount_cents), 0) AS total_region_donations_cents
    FROM
      regions r
      LEFT JOIN donations d ON d.intent_region_id = r.id
      AND d.status = 'completed'
      AND d.deleted_at IS NULL
    WHERE
      r.deleted_at IS NULL
    GROUP BY
      r.id
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
  -- Keep original budget_cents for backward compatibility
  COALESCE(lfa.total_budget_cents, 0) AS budget_cents,
  -- Calculate remaining budget: sum of language remaining budgets minus region/language donations
  -- Note: Language donations are already subtracted in language_funding_remaining, but we subtract
  -- them again here as requested to provide independent region-level calculation
  GREATEST(
    COALESCE(lrba.total_remaining_budget_cents, 0) - COALESCE(lds.total_language_donations_cents, 0) - COALESCE(rds.total_region_donations_cents, 0),
    0
  ) AS remaining_budget_cents,
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
  LEFT JOIN language_remaining_budget_agg lrba ON lrba.region_id = r.id
  LEFT JOIN language_donations_sum lds ON lds.region_id = r.id
  LEFT JOIN region_donations_sum rds ON rds.region_id = r.id
  LEFT JOIN region_intents ri ON ri.region_id = r.id
  LEFT JOIN language_intents_check lic ON lic.region_id = r.id
  LEFT JOIN language_allocations_check lac ON lac.region_id = r.id
  LEFT JOIN region_funding_overrides rfo ON rfo.region_id = r.id
WHERE
  r.deleted_at IS NULL;


comment ON view region_funding IS 'Computed view showing funding status and budget for regions based on aggregated language funding data. Includes languages from descendant regions and descendant languages. Now includes remaining_budget_cents calculated from language remaining budgets minus region/language donations.';

-- Cleanup Duplicate Individual Partner Orgs
-- Keeps only the most recent org per (name, description, created_by) combination
-- ============================================================================

-- STEP 1: Preview what will be deleted (run this first to verify)
-- ============================================================================
WITH duplicate_groups AS (
  SELECT 
    name,
    description,
    created_by,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as org_ids,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
  FROM partner_orgs
  WHERE is_individual = true
  GROUP BY name, description, created_by
  HAVING COUNT(*) > 1
),
orgs_to_delete AS (
  SELECT 
    dg.name,
    dg.description,
    dg.created_by,
    unnest(dg.org_ids[2:]) as org_id_to_delete,  -- All except the first (most recent)
    unnest(dg.created_dates[2:]) as created_at_to_delete
  FROM duplicate_groups dg
)
SELECT 
  otd.org_id_to_delete as id,
  po.name,
  po.description,
  po.created_by,
  otd.created_at_to_delete as created_at,
  (SELECT COUNT(*) FROM donations WHERE partner_org_id = otd.org_id_to_delete) as donation_count,
  (SELECT COUNT(*) FROM subscriptions WHERE partner_org_id = otd.org_id_to_delete) as subscription_count,
  (SELECT COUNT(*) FROM partner_orgs_projects WHERE partner_org_id = otd.org_id_to_delete) as project_count,
  (SELECT COUNT(*) FROM user_roles WHERE partner_org_id = otd.org_id_to_delete) as role_count
FROM orgs_to_delete otd
JOIN partner_orgs po ON po.id = otd.org_id_to_delete
ORDER BY po.created_by, po.name, otd.created_at_to_delete;


-- STEP 2: Migrate donations and subscriptions to kept orgs, then delete duplicates
-- ============================================================================
-- WARNING: This will migrate donations/subscriptions and delete partner orgs
-- Review the preview above before running this!

-- Create org mapping once
WITH duplicate_groups AS (
  SELECT 
    name,
    description,
    created_by,
    array_agg(id ORDER BY created_at DESC) as org_ids
  FROM partner_orgs
  WHERE is_individual = true
  GROUP BY name, description, created_by
  HAVING COUNT(*) > 1
),
org_mapping AS (
  SELECT 
    unnest(dg.org_ids[2:]) as old_org_id,  -- Duplicates to delete
    dg.org_ids[1] as kept_org_id            -- Most recent to keep
  FROM duplicate_groups dg
)
-- Migrate donations from duplicate orgs to the kept orgs
UPDATE donations
SET partner_org_id = om.kept_org_id
FROM org_mapping om
WHERE donations.partner_org_id = om.old_org_id;

-- Migrate subscriptions from duplicate orgs to the kept orgs
WITH duplicate_groups AS (
  SELECT 
    name,
    description,
    created_by,
    array_agg(id ORDER BY created_at DESC) as org_ids
  FROM partner_orgs
  WHERE is_individual = true
  GROUP BY name, description, created_by
  HAVING COUNT(*) > 1
),
org_mapping AS (
  SELECT 
    unnest(dg.org_ids[2:]) as old_org_id,  -- Duplicates to delete
    dg.org_ids[1] as kept_org_id            -- Most recent to keep
  FROM duplicate_groups dg
)
UPDATE subscriptions
SET partner_org_id = om.kept_org_id
FROM org_mapping om
WHERE subscriptions.partner_org_id = om.old_org_id;

-- Now delete the duplicate orgs (donations have been migrated)
WITH duplicate_groups AS (
  SELECT 
    name,
    description,
    created_by,
    array_agg(id ORDER BY created_at DESC) as org_ids
  FROM partner_orgs
  WHERE is_individual = true
  GROUP BY name, description, created_by
  HAVING COUNT(*) > 1
),
orgs_to_delete AS (
  SELECT unnest(dg.org_ids[2:]) as org_id  -- All except the first (most recent)
  FROM duplicate_groups dg
)
DELETE FROM partner_orgs
WHERE id IN (SELECT org_id FROM orgs_to_delete)
RETURNING 
  id,
  name,
  description,
  created_by,
  created_at,
  'Deleted' as status;

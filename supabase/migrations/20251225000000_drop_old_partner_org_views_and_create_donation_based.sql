-- Drop old sponsorship-based partner org views
-- These are replaced by donation-based queries
DROP VIEW if EXISTS vw_partner_org_active_projects cascade;


DROP VIEW if EXISTS vw_partner_org_pending_languages cascade;


DROP VIEW if EXISTS vw_partner_org_language_entities cascade;


-- Create donation-based view for partner org projects
-- This view joins partner_orgs -> donations -> donation_allocations -> projects
CREATE OR REPLACE VIEW vw_partner_org_projects_via_donations AS
SELECT DISTINCT
  po.id AS partner_org_id,
  p.id AS project_id,
  p.name AS project_name,
  p.description AS project_description,
  p.target_language_entity_id AS language_entity_id,
  le.name AS language_name,
  da.id AS allocation_id,
  da.amount_cents AS allocation_amount_cents,
  da.currency_code AS allocation_currency_code,
  da.effective_from,
  da.effective_to,
  d.id AS donation_id,
  d.status AS donation_status,
  d.intent_type,
  d.intent_language_entity_id,
  d.intent_region_id,
  d.intent_operation_id
FROM
  partner_orgs po
  JOIN donations d ON d.partner_org_id = po.id
  JOIN donation_allocations da ON da.donation_id = d.id
  JOIN projects p ON p.id = da.project_id
  JOIN language_entities le ON le.id = p.target_language_entity_id
WHERE
  d.deleted_at IS NULL
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
  AND p.deleted_at IS NULL;


comment ON view vw_partner_org_projects_via_donations IS 'Maps partner orgs to projects via donations and donation_allocations. Shows active allocations only.';


-- Create view for partner org language entities (for analytics queries)
CREATE OR REPLACE VIEW vw_partner_org_language_entities_via_donations AS
SELECT DISTINCT
  po.id AS partner_org_id,
  p.target_language_entity_id AS language_entity_id,
  p.id AS project_id
FROM
  partner_orgs po
  JOIN donations d ON d.partner_org_id = po.id
  JOIN donation_allocations da ON da.donation_id = d.id
  JOIN projects p ON p.id = da.project_id
WHERE
  d.deleted_at IS NULL
  AND (
    da.effective_to IS NULL
    OR da.effective_to >= current_date
  )
  AND p.deleted_at IS NULL;


comment ON view vw_partner_org_language_entities_via_donations IS 'Maps partner orgs to language entities through active donation allocations (for analytics queries)';

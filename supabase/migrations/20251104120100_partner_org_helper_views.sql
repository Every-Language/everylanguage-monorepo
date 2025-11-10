-- Create helper views for partner org data queries
-- These views simplify querying for active projects vs pending language sponsorships
-- View: Active projects only (excludes pending languages)
CREATE OR REPLACE VIEW vw_partner_org_active_projects AS
SELECT DISTINCT
  s.partner_org_id,
  p.id AS project_id,
  p.name AS project_name,
  p.description AS project_description,
  p.target_language_entity_id AS language_entity_id,
  le.name AS language_name,
  s.id AS sponsorship_id,
  s.status AS sponsorship_status,
  sa.allocation_percent,
  sa.effective_from,
  sa.effective_to
FROM
  sponsorships s
  JOIN sponsorship_allocations sa ON sa.sponsorship_id = s.id
  AND (
    sa.effective_to IS NULL
    OR sa.effective_to >= current_date
  )
  JOIN projects p ON p.id = sa.project_id
  JOIN language_entities le ON le.id = p.target_language_entity_id
WHERE
  s.status IN ('active', 'pledged');


comment ON view vw_partner_org_active_projects IS 'Active projects for a partner org (excludes pending language sponsorships)';


-- View: Pending languages only
CREATE OR REPLACE VIEW vw_partner_org_pending_languages AS
SELECT DISTINCT
  s.partner_org_id,
  la.id AS language_adoption_id,
  la.language_entity_id,
  le.name AS language_name,
  la.estimated_budget_cents,
  la.currency_code,
  la.status AS adoption_status,
  s.id AS sponsorship_id,
  s.status AS sponsorship_status,
  s.pledge_one_time_cents,
  s.pledge_recurring_cents,
  s.created_at AS sponsorship_created_at
FROM
  sponsorships s
  JOIN language_adoptions la ON la.id = s.language_adoption_id
  JOIN language_entities le ON le.id = la.language_entity_id
WHERE
  s.language_adoption_id IS NOT NULL
  AND NOT EXISTS (
    SELECT
      1
    FROM
      sponsorship_allocations sa
    WHERE
      sa.sponsorship_id = s.id
      AND (
        sa.effective_to IS NULL
        OR sa.effective_to >= current_date
      )
  )
  AND s.status IN ('interest', 'pledged', 'active');


comment ON view vw_partner_org_pending_languages IS 'Pending language sponsorships for a partner org (not yet allocated to projects)';


-- View: Language entities for active projects (for querying analytics)
CREATE OR REPLACE VIEW vw_partner_org_language_entities AS
SELECT DISTINCT
  s.partner_org_id,
  p.target_language_entity_id AS language_entity_id,
  p.id AS project_id
FROM
  sponsorships s
  JOIN sponsorship_allocations sa ON sa.sponsorship_id = s.id
  AND (
    sa.effective_to IS NULL
    OR sa.effective_to >= current_date
  )
  JOIN projects p ON p.id = sa.project_id
WHERE
  s.status IN ('active', 'pledged');


comment ON view vw_partner_org_language_entities IS 'Maps partner orgs to language entities through active project allocations';

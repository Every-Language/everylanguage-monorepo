-- Add Language Funding Remaining View
-- Creates a view that calculates remaining budget for languages
-- (total budget minus completed donations with intent to that language)
-- ============================================================================
-- CREATE LANGUAGE_FUNDING_REMAINING VIEW
-- ============================================================================
CREATE OR REPLACE VIEW language_funding_remaining AS
SELECT
  lf.id,
  lf.language_entity_id,
  lf.funding_status,
  lf.budget_cents,
  lf.created_at,
  lf.updated_at,
  lf.created_by,
  lf.deleted_at,
  -- Calculate remaining budget: budget_cents - sum of completed donations
  COALESCE(lf.budget_cents, 0) - COALESCE(
    (
      SELECT
        SUM(d.amount_cents)
      FROM
        donations d
      WHERE
        d.intent_language_entity_id = lf.language_entity_id
        AND d.status = 'completed'
        AND d.deleted_at IS NULL
    ),
    0
  ) AS remaining_budget_cents
FROM
  language_funding lf
WHERE
  lf.deleted_at IS NULL;


comment ON view language_funding_remaining IS 'View showing language funding with remaining budget calculated as total budget minus completed donations with intent to that language.';

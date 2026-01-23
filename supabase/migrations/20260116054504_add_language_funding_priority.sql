-- Add priority column for manual ordering in funding dashboards (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'language_funding'
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.language_funding
      ADD COLUMN priority INTEGER;
  END IF;
END $$;


-- Recreate language_funding_balances view to include priority
CREATE OR REPLACE VIEW public.language_funding_balances (
  id,
  language_entity_id,
  funding_status,
  budget_cents,
  created_at,
  updated_at,
  created_by,
  deleted_at,
  remaining_budget_cents,
  priority
) AS
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
        public.donations d
      WHERE
        d.intent_language_entity_id = lf.language_entity_id
        AND d.status = 'completed'
        AND d.deleted_at IS NULL
    ),
    0
  ) AS remaining_budget_cents,
  lf.priority
FROM
  public.language_funding lf
WHERE
  lf.deleted_at IS NULL;


comment ON view public.language_funding_balances IS 'View showing language funding with remaining budget calculated as total budget minus completed donations with intent to that language. Includes priority for manual ordering.';

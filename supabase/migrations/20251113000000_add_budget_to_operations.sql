-- Add budget_cents column to operations table
-- This allows operations to have a budget for adoption/contribution tracking
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS budget_cents INTEGER CHECK (
  budget_cents IS NULL
  OR budget_cents > 0
);


-- Add index for filtering by budget
CREATE INDEX if NOT EXISTS idx_operations_budget_cents ON operations (budget_cents)
WHERE
  deleted_at IS NULL
  AND budget_cents IS NOT NULL;


-- Add comment
comment ON COLUMN operations.budget_cents IS 'Total budget required to fully fund this operation in cents. NULL means budget not yet set.';

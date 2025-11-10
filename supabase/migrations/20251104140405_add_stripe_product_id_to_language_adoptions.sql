-- Add stripe_product_id column to language_adoptions table
-- This will store the Stripe Product ID created for each adoption,
-- allowing us to reuse products instead of creating them on-the-fly during checkout
ALTER TABLE language_adoptions
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;


-- Add index for faster lookups when querying by stripe_product_id
CREATE INDEX if NOT EXISTS idx_language_adoptions_stripe_product_id ON language_adoptions (stripe_product_id);


-- Add comment explaining the column
comment ON COLUMN language_adoptions.stripe_product_id IS 'Stripe Product ID pre-created for this language adoption. Used for subscription billing.';

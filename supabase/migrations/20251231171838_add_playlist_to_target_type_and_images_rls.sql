-- Add 'playlist' to target_type enum and RLS policy for images
-- This migration adds the 'playlist' value to the target_type enum to support
-- playlist image uploads and creates RLS policy for users to create own images
-- as specified in EL-126
-- ============================================================================
-- ============================================================================
-- PART 1: ADD 'playlist' TO target_type ENUM
-- ============================================================================
DO $$
BEGIN
  -- Add 'playlist' value to target_type enum if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'playlist' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'target_type')
  ) THEN
    ALTER TYPE target_type ADD VALUE 'playlist';
  END IF;
END $$;


-- ============================================================================
-- PART 2: CREATE RLS POLICY FOR IMAGES INSERT
-- ============================================================================
-- Drop existing policy if it exists (idempotent)
DROP POLICY if EXISTS "Users can insert images" ON images;


DROP POLICY if EXISTS "Users can insert own images" ON images;


-- Create RLS policy for users to insert their own images
-- Wrapped auth.uid() in SELECT for performance optimization (evaluates once per query)
CREATE POLICY "Users can insert own images" ON images FOR insert
WITH
  CHECK (
    created_by = (
      SELECT
        auth.uid ()
    )
  );

-- Add foreign key constraint for sequences.chapter_id
-- This ensures referential integrity between sequences and chapters
-- Check if the constraint already exists before adding it
DO $$
BEGIN
  -- Check if foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'sequences'
      AND kcu.column_name = 'chapter_id'
      AND ccu.table_name = 'chapters'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.sequences
    ADD CONSTRAINT sequences_chapter_id_fkey
    FOREIGN KEY (chapter_id)
    REFERENCES chapters(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added foreign key constraint sequences_chapter_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint sequences_chapter_id_fkey already exists, skipping';
  END IF;
END $$;

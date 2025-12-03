-- Add/standardize publish_status columns
-- Migrate project_updates visibility to publish_status
-- Add publish_status to audio_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audio_versions' AND column_name = 'publish_status'
  ) THEN
    ALTER TABLE public.audio_versions 
    ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_audio_versions_publish_status 
    ON public.audio_versions (publish_status);
  END IF;
END $$;


-- Add publish_status to text_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'text_versions' AND column_name = 'publish_status'
  ) THEN
    ALTER TABLE public.text_versions 
    ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_text_versions_publish_status 
    ON public.text_versions (publish_status);
  END IF;
END $$;


-- Add publish_status to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'publish_status'
  ) THEN
    ALTER TABLE public.projects 
    ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_projects_publish_status 
    ON public.projects (publish_status);
  END IF;
END $$;


-- Migrate project_updates visibility to publish_status
DO $$
BEGIN
  -- Check if visibility column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_updates' AND column_name = 'visibility'
  ) THEN
    -- Drop policy that depends on visibility column first
    DROP POLICY IF EXISTS "Anyone can view public project updates" ON public.project_updates;
    
    -- Add publish_status column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'project_updates' AND column_name = 'publish_status'
    ) THEN
      ALTER TABLE public.project_updates 
      ADD COLUMN publish_status publish_status DEFAULT 'pending' NOT NULL;
    END IF;
    
    -- Migrate data: visibility='public' -> publish_status='published', others -> 'pending'
    UPDATE public.project_updates
    SET publish_status = CASE 
      WHEN visibility = 'public' THEN 'published'::publish_status
      ELSE 'pending'::publish_status
    END;
    
    -- Drop visibility column
    ALTER TABLE public.project_updates DROP COLUMN visibility;
    
    -- Drop update_visibility enum if no longer used
    DROP TYPE IF EXISTS update_visibility;
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_project_updates_publish_status 
    ON public.project_updates (publish_status);
  END IF;
END $$;

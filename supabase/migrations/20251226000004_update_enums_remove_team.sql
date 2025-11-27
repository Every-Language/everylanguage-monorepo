-- Update enums: remove 'team' from resource_type and add verse_feedback permissions
-- Note: PostgreSQL doesn't support removing enum values, so we recreate the enum
-- Drop has_permission function first (it uses resource_type as parameter type)
-- CASCADE will drop all dependent policies and objects
DROP POLICY if EXISTS bases_insert_with_permission ON public.bases;


DROP POLICY if EXISTS bases_update_with_permission ON public.bases;


DROP POLICY if EXISTS bases_delete_with_permission ON public.bases;


DROP POLICY if EXISTS partner_orgs_insert_with_permission ON public.partner_orgs;


DROP POLICY if EXISTS partner_orgs_update_with_permission ON public.partner_orgs;


DROP POLICY if EXISTS partner_orgs_delete_with_permission ON public.partner_orgs;


-- Now drop the function (CASCADE will handle remaining dependencies)
DROP FUNCTION if EXISTS public.has_permission (UUID, permission_key, resource_type, UUID) cascade;


-- Recreate the enum without 'team'
DO $$
BEGIN
  -- Check if we need to recreate the enum
  IF EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'team' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'resource_type')
  ) THEN
    -- Create new enum without 'team'
    CREATE TYPE resource_type_new AS ENUM ('global', 'project', 'base', 'partner');
    
    -- Migrate existing data
    ALTER TABLE public.role_permissions 
      ALTER COLUMN resource_type TYPE TEXT USING resource_type::TEXT;
    
    ALTER TABLE public.role_permissions 
      ALTER COLUMN resource_type TYPE resource_type_new USING resource_type::TEXT::resource_type_new;
    
    ALTER TABLE public.roles 
      ALTER COLUMN resource_type TYPE TEXT USING resource_type::TEXT;
    
    ALTER TABLE public.roles 
      ALTER COLUMN resource_type TYPE resource_type_new USING resource_type::TEXT::resource_type_new;
    
    -- Drop old enum (CASCADE will handle dependent objects)
    DROP TYPE resource_type CASCADE;
    
    -- Rename new enum
    ALTER TYPE resource_type_new RENAME TO resource_type;
    
    -- Restore column types (they should already be correct, but ensure they are)
    ALTER TABLE public.role_permissions 
      ALTER COLUMN resource_type TYPE resource_type USING resource_type::TEXT::resource_type;
    
    ALTER TABLE public.roles 
      ALTER COLUMN resource_type TYPE resource_type USING resource_type::TEXT::resource_type;
  END IF;
END $$;


-- Add verse_feedback permissions to permission_key enum
DO $$
BEGIN
  -- Check if values already exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'verse_feedback.read' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_key')
  ) THEN
    ALTER TYPE permission_key ADD VALUE 'verse_feedback.read';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'verse_feedback.write' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_key')
  ) THEN
    ALTER TYPE permission_key ADD VALUE 'verse_feedback.write';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'verse_feedback.delete' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_key')
  ) THEN
    ALTER TYPE permission_key ADD VALUE 'verse_feedback.delete';
  END IF;
END $$;

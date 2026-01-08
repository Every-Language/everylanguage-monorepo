-- Create denormalized user_projects table for PowerSync
-- Migration: 20251230215607_create_user_projects_denormalized_table.sql
-- 
-- This migration creates a denormalized user_projects table that directly links
-- users to projects with their role information. This table is maintained by
-- triggers on the user_roles table to ensure data consistency.
--
-- Why denormalized table instead of view?
-- - PowerSync sync rules need to query tables directly, not views
-- - Views with auth.uid() don't work well with PowerSync's parameter system
-- - Denormalized table allows efficient indexed queries by user_id
-- - Triggers ensure data stays in sync automatically
-- ============================================================================
-- CREATE USER_PROJECTS TABLE
-- ============================================================================
-- Drop the existing view first (created in earlier migrations)
DROP VIEW if EXISTS public.user_projects cascade;


CREATE TABLE public.user_projects (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user_id UUID REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects (id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles (id) ON DELETE CASCADE NOT NULL,
  role_key TEXT NOT NULL, -- Denormalized from roles table
  role_name TEXT NOT NULL, -- Denormalized from roles table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, project_id, role_id)
);


-- Create indexes for PowerSync query performance
CREATE INDEX if NOT EXISTS idx_user_projects_user_id ON public.user_projects (user_id);


CREATE INDEX if NOT EXISTS idx_user_projects_project_id ON public.user_projects (project_id);


CREATE INDEX if NOT EXISTS idx_user_projects_role_id ON public.user_projects (role_id);


-- Add comments
comment ON TABLE public.user_projects IS 'Denormalized table linking users to projects with role information. Maintained by triggers on user_roles table. Used by PowerSync for efficient user-scoped queries.';


comment ON COLUMN public.user_projects.user_id IS 'User ID from public.users table';


comment ON COLUMN public.user_projects.project_id IS 'Project ID from public.projects table';


comment ON COLUMN public.user_projects.role_id IS 'Role ID from public.roles table';


comment ON COLUMN public.user_projects.role_key IS 'Denormalized role key from roles table for efficient PowerSync queries';


comment ON COLUMN public.user_projects.role_name IS 'Denormalized role name from roles table for efficient PowerSync queries';


-- ============================================================================
-- CREATE TRIGGER FUNCTIONS
-- ============================================================================
-- Function: Sync user_projects on user_roles INSERT
CREATE OR REPLACE FUNCTION public.sync_user_projects_on_user_role_insert () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_role_key TEXT;
  v_role_name TEXT;
BEGIN
  -- Disable RLS to prevent recursion when querying roles table
  SET LOCAL row_security = off;
  
  -- Only process project-scoped roles
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get role information
  SELECT r.role_key, r.name
  INTO v_role_key, v_role_name
  FROM public.roles r
  WHERE r.id = NEW.role_id;
  
  -- Insert into user_projects if role found
  IF v_role_key IS NOT NULL THEN
    INSERT INTO public.user_projects (
      user_id,
      project_id,
      role_id,
      role_key,
      role_name,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      NEW.project_id,
      NEW.role_id,
      v_role_key,
      v_role_name,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (user_id, project_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.sync_user_projects_on_user_role_insert () IS 'Trigger function to insert into user_projects when a project-scoped user_role is created. Uses SECURITY DEFINER with row_security disabled to prevent RLS recursion.';


-- Function: Sync user_projects on user_roles UPDATE
CREATE OR REPLACE FUNCTION public.sync_user_projects_on_user_role_update () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
DECLARE
  v_role_key TEXT;
  v_role_name TEXT;
BEGIN
  -- Disable RLS to prevent recursion when querying roles table
  SET LOCAL row_security = off;
  
  -- Handle case where project_id changed or was removed
  IF OLD.project_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.project_id != OLD.project_id) THEN
    -- Delete old user_projects record
    DELETE FROM public.user_projects
    WHERE user_id = OLD.user_id
      AND project_id = OLD.project_id
      AND role_id = OLD.role_id;
  END IF;
  
  -- Handle case where project_id was added or changed
  IF NEW.project_id IS NOT NULL AND (OLD.project_id IS NULL OR NEW.project_id != OLD.project_id) THEN
    -- Get role information
    SELECT r.role_key, r.name
    INTO v_role_key, v_role_name
    FROM public.roles r
    WHERE r.id = NEW.role_id;
    
    -- Insert new user_projects record
    IF v_role_key IS NOT NULL THEN
      INSERT INTO public.user_projects (
        user_id,
        project_id,
        role_id,
        role_key,
        role_name,
        created_at,
        updated_at
      )
      VALUES (
        NEW.user_id,
        NEW.project_id,
        NEW.role_id,
        v_role_key,
        v_role_name,
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (user_id, project_id, role_id) DO UPDATE
      SET
        role_key = EXCLUDED.role_key,
        role_name = EXCLUDED.role_name,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END IF;
  
  -- Handle case where role_id changed but project_id stayed the same
  IF NEW.project_id IS NOT NULL 
     AND OLD.project_id IS NOT NULL 
     AND NEW.project_id = OLD.project_id 
     AND NEW.role_id != OLD.role_id THEN
    -- Delete old role record
    DELETE FROM public.user_projects
    WHERE user_id = OLD.user_id
      AND project_id = OLD.project_id
      AND role_id = OLD.role_id;
    
    -- Get new role information
    SELECT r.role_key, r.name
    INTO v_role_key, v_role_name
    FROM public.roles r
    WHERE r.id = NEW.role_id;
    
    -- Insert new role record
    IF v_role_key IS NOT NULL THEN
      INSERT INTO public.user_projects (
        user_id,
        project_id,
        role_id,
        role_key,
        role_name,
        created_at,
        updated_at
      )
      VALUES (
        NEW.user_id,
        NEW.project_id,
        NEW.role_id,
        v_role_key,
        v_role_name,
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (user_id, project_id, role_id) DO UPDATE
      SET
        role_key = EXCLUDED.role_key,
        role_name = EXCLUDED.role_name,
        updated_at = EXCLUDED.updated_at;
    END IF;
  END IF;
  
  -- Handle case where role information might have changed (role_key or role_name updated in roles table)
  IF NEW.project_id IS NOT NULL 
     AND OLD.project_id IS NOT NULL 
     AND NEW.project_id = OLD.project_id 
     AND NEW.role_id = OLD.role_id THEN
    -- Get updated role information
    SELECT r.role_key, r.name
    INTO v_role_key, v_role_name
    FROM public.roles r
    WHERE r.id = NEW.role_id;
    
    -- Update role information if changed
    IF v_role_key IS NOT NULL THEN
      UPDATE public.user_projects
      SET
        role_key = v_role_key,
        role_name = v_role_name,
        updated_at = NEW.updated_at
      WHERE user_id = NEW.user_id
        AND project_id = NEW.project_id
        AND role_id = NEW.role_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


comment ON function public.sync_user_projects_on_user_role_update () IS 'Trigger function to update user_projects when a project-scoped user_role is updated. Uses SECURITY DEFINER with row_security disabled to prevent RLS recursion.';


-- Function: Sync user_projects on user_roles DELETE
CREATE OR REPLACE FUNCTION public.sync_user_projects_on_user_role_delete () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS to prevent recursion
  SET LOCAL row_security = off;
  
  -- Only process project-scoped roles
  IF OLD.project_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Delete from user_projects
  DELETE FROM public.user_projects
  WHERE user_id = OLD.user_id
    AND project_id = OLD.project_id
    AND role_id = OLD.role_id;
  
  RETURN OLD;
END;
$$;


comment ON function public.sync_user_projects_on_user_role_delete () IS 'Trigger function to delete from user_projects when a project-scoped user_role is deleted. Uses SECURITY DEFINER with row_security disabled to prevent RLS recursion.';


-- Function: Sync user_projects when role information changes in roles table
CREATE OR REPLACE FUNCTION public.sync_user_projects_on_role_update () returns trigger language plpgsql security definer
SET
  search_path = public,
  pg_temp AS $$
BEGIN
  -- Disable RLS to prevent recursion
  SET LOCAL row_security = off;
  
  -- Update all user_projects records with this role
  UPDATE public.user_projects
  SET
    role_key = NEW.role_key,
    role_name = NEW.name,
    updated_at = NOW()
  WHERE role_id = NEW.id;
  
  RETURN NEW;
END;
$$;


comment ON function public.sync_user_projects_on_role_update () IS 'Trigger function to update user_projects when role information (role_key or name) changes in roles table. Uses SECURITY DEFINER with row_security disabled to prevent RLS recursion.';


-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================
-- Trigger on user_roles INSERT
DROP TRIGGER if EXISTS trg_user_roles_insert_sync_user_projects ON public.user_roles;


CREATE TRIGGER trg_user_roles_insert_sync_user_projects
AFTER insert ON public.user_roles FOR each ROW
EXECUTE function public.sync_user_projects_on_user_role_insert ();


-- Trigger on user_roles UPDATE
DROP TRIGGER if EXISTS trg_user_roles_update_sync_user_projects ON public.user_roles;


CREATE TRIGGER trg_user_roles_update_sync_user_projects
AFTER
UPDATE ON public.user_roles FOR each ROW WHEN (
  old.project_id IS DISTINCT FROM new.project_id
  OR old.role_id IS DISTINCT FROM new.role_id
  OR old.user_id IS DISTINCT FROM new.user_id
)
EXECUTE function public.sync_user_projects_on_user_role_update ();


-- Trigger on user_roles DELETE
DROP TRIGGER if EXISTS trg_user_roles_delete_sync_user_projects ON public.user_roles;


CREATE TRIGGER trg_user_roles_delete_sync_user_projects
AFTER delete ON public.user_roles FOR each ROW
EXECUTE function public.sync_user_projects_on_user_role_delete ();


-- Trigger on roles UPDATE (to sync role_key and role_name changes)
DROP TRIGGER if EXISTS trg_roles_update_sync_user_projects ON public.roles;


CREATE TRIGGER trg_roles_update_sync_user_projects
AFTER
UPDATE of role_key,
name ON public.roles FOR each ROW WHEN (
  old.role_key IS DISTINCT FROM new.role_key
  OR old.name IS DISTINCT FROM new.name
)
EXECUTE function public.sync_user_projects_on_role_update ();


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant SELECT to authenticated users (PowerSync will use this)
GRANT
SELECT
  ON public.user_projects TO authenticated;


-- Grant EXECUTE on trigger functions to authenticated (for triggers)
GRANT
EXECUTE ON function public.sync_user_projects_on_user_role_insert () TO authenticated;


GRANT
EXECUTE ON function public.sync_user_projects_on_user_role_update () TO authenticated;


GRANT
EXECUTE ON function public.sync_user_projects_on_user_role_delete () TO authenticated;


GRANT
EXECUTE ON function public.sync_user_projects_on_role_update () TO authenticated;


-- ============================================================================
-- BACKFILL EXISTING DATA
-- ============================================================================
-- Populate user_projects from existing user_roles where project_id IS NOT NULL
INSERT INTO
  public.user_projects (
    user_id,
    project_id,
    role_id,
    role_key,
    role_name,
    created_at,
    updated_at
  )
SELECT
  ur.user_id,
  ur.project_id,
  ur.role_id,
  r.role_key,
  r.name AS role_name,
  ur.created_at,
  ur.updated_at
FROM
  public.user_roles ur
  INNER JOIN public.roles r ON r.id = ur.role_id
WHERE
  ur.project_id IS NOT NULL
  AND r.role_key IS NOT NULL
ON CONFLICT (user_id, project_id, role_id) DO NOTHING;


-- ============================================================================
-- RLS POLICIES
-- ============================================================================
-- Enable RLS on user_projects table
ALTER TABLE public.user_projects enable ROW level security;


-- Policy: Users can only see their own project assignments
CREATE POLICY user_projects_select_own ON public.user_projects FOR
SELECT
  USING (
    user_id = (
      SELECT
        auth.uid ()
    )
  );


comment ON policy user_projects_select_own ON public.user_projects IS 'Users can only view their own project assignments. Used by PowerSync for user-scoped data sync.';

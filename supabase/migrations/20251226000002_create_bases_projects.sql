-- Create bases_projects table for base-project inheritance
-- This replaces the bases_teams -> projects_teams inheritance pathway
CREATE TABLE IF NOT EXISTS public.bases_projects (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  base_id UUID NOT NULL REFERENCES public.bases (id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ NULL
);


CREATE INDEX if NOT EXISTS bases_projects_base_id_idx ON public.bases_projects (base_id);


CREATE INDEX if NOT EXISTS bases_projects_project_id_idx ON public.bases_projects (project_id);


CREATE UNIQUE INDEX if NOT EXISTS bases_projects_active_pair_uniq ON public.bases_projects (base_id, project_id)
WHERE
  unassigned_at IS NULL;


-- Enable RLS on bases_projects
-- Note: RLS policies will be created in migration 20251226000008_update_rls_policies.sql
-- after has_permission function is recreated
ALTER TABLE public.bases_projects enable ROW level security;

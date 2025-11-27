-- Drop teams tables and clean up team-related data
-- Teams system is being removed entirely
-- First, clean up any team-related data
DELETE FROM public.role_permissions
WHERE
  resource_type::TEXT = 'team';


DELETE FROM public.roles
WHERE
  resource_type::TEXT = 'team';


DELETE FROM public.user_roles
WHERE
  context_type = 'team';


-- Drop teams tables
DROP TABLE IF EXISTS public.projects_teams cascade;


DROP TABLE IF EXISTS public.bases_teams cascade;


DROP TABLE IF EXISTS public.teams cascade;

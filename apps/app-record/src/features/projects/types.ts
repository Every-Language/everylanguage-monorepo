import type { Database } from '@everylanguage/shared-types';

// Type for user_projects table (not yet in shared-types, will be after migration)
export type UserProjectRow = {
  id: string;
  user_id: string;
  project_id: string;
  role_id: string;
  role_key: string;
  role_name: string;
  created_at: string | null;
  updated_at: string | null;
};

export type Project = Database['public']['Tables']['projects']['Row'];

export type UserProject = UserProjectRow & {
  project: Project;
};

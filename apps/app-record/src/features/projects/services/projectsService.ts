import { supabase } from '@/shared/services/supabase';
import type { Database } from '@everylanguage/shared-types';

// Type for user_projects table (not yet in shared-types, will be after migration)
type UserProjectRow = {
  id: string;
  user_id: string;
  project_id: string;
  role_id: string;
  role_key: string;
  role_name: string;
  created_at: string | null;
  updated_at: string | null;
};

type ProjectRow = Database['public']['Tables']['projects']['Row'];

type UserProject = UserProjectRow & {
  project: ProjectRow;
};

export class ProjectsService {
  /**
   * Fetch all projects for the current authenticated user
   * Joins user_projects with projects table to get full project information
   */
  async getUserProjects(): Promise<UserProject[]> {
    try {
      // Verify user is authenticated before querying
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: userProjectsData, error: userProjectsError } =
        await supabase
          .from('user_projects')
          .select('*')
          .order('created_at', { ascending: false });

      if (userProjectsError) {
        console.error('Error fetching user projects:', userProjectsError);
        throw userProjectsError;
      }

      if (!userProjectsData || userProjectsData.length === 0) {
        return [];
      }

      // Type assert user_projects data
      const userProjects = userProjectsData as unknown as UserProjectRow[];

      // Get unique project IDs, filtering out any undefined/null values
      const projectIds = [
        ...new Set(
          userProjects
            .map(up => up.project_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      // If no valid project IDs, return empty array
      if (projectIds.length === 0) {
        return [];
      }

      // Fetch full project details
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      // Combine user_projects with project data
      const projectsMap = new Map(
        (projectsData ?? []).map(p => [p.id ?? '', p])
      );

      const result: UserProject[] = userProjects
        .map(up => {
          const project = projectsMap.get(up.project_id);
          if (!project) return null;
          return {
            ...up,
            project,
          };
        })
        .filter((up): up is UserProject => up !== null);

      return result;
    } catch (error) {
      console.error('Unexpected error fetching user projects:', error);
      throw error;
    }
  }

  /**
   * Subscribe to changes in user projects
   */
  onUserProjectsChange(callback: (projects: UserProject[]) => void): {
    unsubscribe: () => void;
  } {
    const subscription = supabase
      .channel('user_projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_projects',
        },
        async () => {
          // Refetch projects when changes occur
          const projects = await this.getUserProjects();
          callback(projects);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  }
}

export const projectsService = new ProjectsService();

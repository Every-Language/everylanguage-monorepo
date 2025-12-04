import { useFetchCollection, useFetchById, transformError } from './base-hooks';
import { useQuery } from '@tanstack/react-query';
import type { TableRow, SupabaseError } from './base-hooks';
import { supabase } from '../../services/supabase';

export type Project = TableRow<'projects'>;

// Hook to fetch all projects
export function useProjects() {
  return useFetchCollection('projects');
}

// Hook to fetch a single project by ID
export function useProject(id: string | null) {
  return useFetchById('projects', id);
}

// Hook to fetch projects by user ID
// Uses user_projects view which returns projects where user has a role (not just created_by)
export function useProjectsByUser(userId: string | null) {
  return useQuery({
    queryKey: ['user-projects', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_projects').select('*');
      if (error) throw transformError(error);
      return (data || []) as Project[];
    },
    staleTime: 300_000, // 5 minutes
  });
}

// Hook to fetch project member count
export function useProjectMemberCount(projectId: string | null) {
  return useQuery<number, SupabaseError>({
    queryKey: ['project-member-count', projectId],
    queryFn: async () => {
      if (!projectId) return 0;

      // TODO: Implement proper project_members table query when available
      // For now, return 1 as default (project creator)
      // Future implementation:
      // const { count } = await supabase
      //   .from('project_members')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('project_id', projectId)
      // return count || 1

      return 1;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch enhanced project metadata
export function useProjectWithMetadata(projectId: string | null) {
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useProject(projectId);
  const { data: memberCount, isLoading: memberLoading } =
    useProjectMemberCount(projectId);

  return {
    data: project
      ? {
          ...project,
          member_count: memberCount || 1,
        }
      : null,
    isLoading: projectLoading || memberLoading,
    error: projectError,
  };
}

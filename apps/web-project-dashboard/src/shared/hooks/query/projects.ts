import { useFetchCollection, useFetchById, transformError } from './base-hooks';
import { useQuery } from '@tanstack/react-query';
import type { TableRow, SupabaseError } from './base-hooks';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../../features/auth/hooks/useAuth';

export type Project = TableRow<'projects'>;

// Hook to fetch all projects
export function useProjects() {
  return useFetchCollection('projects');
}

// Hook to fetch a single project by ID
export function useProject(id: string | null) {
  return useFetchById('projects', id);
}

// Hook to check if current user is a system admin
export function useIsSystemAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-system-admin', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      // Check if user has system_admin role with is_global flag
      // Global roles have is_global = TRUE and all context columns are NULL
      const { data, error } = await supabase
        .from('user_roles')
        .select(
          `
          role:roles!user_roles_role_id_fkey (
            role_key
          )
        `
        )
        .eq('user_id', user.id)
        .eq('is_global', true)
        .is('project_id', null)
        .is('base_id', null)
        .is('partner_org_id', null)
        .limit(1);

      if (error) {
        console.error('Error checking system admin:', error);
        return false;
      }

      return (
        data?.some(
          (ur: { role: { role_key: string | null } | null }) =>
            ur.role?.role_key === 'system_admin'
        ) ?? false
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch projects by user ID
// Uses user_projects view which returns projects where user has a role (not just created_by)
// For system admins, fetches all projects from the projects table
export function useProjectsByUser(userId: string | null) {
  const { data: isSystemAdmin = false, isLoading: checkingAdmin } =
    useIsSystemAdmin();

  return useQuery({
    queryKey: ['user-projects', userId, isSystemAdmin],
    enabled: !!userId && !checkingAdmin,
    queryFn: async () => {
      if (isSystemAdmin) {
        // For system admins, fetch all projects
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) throw transformError(error);
        return (data || []) as Project[];
      } else {
        // For regular users, use user_projects view
        const { data, error } = await supabase
          .from('user_projects')
          .select('*');
        if (error) throw transformError(error);
        return (data || []) as Project[];
      }
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

// Type for project fuzzy search results from search_projects RPC
export interface ProjectSearchResult {
  project_id: string;
  project_name: string;
  target_language_entity_id: string;
  target_language_name: string;
  similarity_score: number;
}

// Hook for fuzzy search of projects using pg_trgm similarity
// Works for both authenticated and anonymous users (RPC uses SECURITY DEFINER)
export function useProjectsSearch(
  query: string,
  options: {
    maxResults?: number;
    minSimilarity?: number;
    enabled?: boolean;
  } = {}
): {
  data: ProjectSearchResult[] | undefined;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
} {
  const { maxResults = 50, minSimilarity = 0.1, enabled = true } = options;

  return useQuery({
    queryKey: ['projects_search', query, maxResults, minSimilarity],
    queryFn: async (): Promise<ProjectSearchResult[]> => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase.rpc('search_projects', {
        search_query: query,
        max_results: maxResults,
        min_similarity: minSimilarity,
      });

      if (error) throw transformError(error);
      return (data || []) as ProjectSearchResult[];
    },
    enabled: enabled && !!query && query.length >= 2,
    staleTime: 30_000,
  });
}

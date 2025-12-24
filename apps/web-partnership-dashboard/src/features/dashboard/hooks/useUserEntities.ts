import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/services/supabase';

export type SimpleEntity = {
  id: string;
  name: string;
  description?: string;
};

export type EntityWithRole = SimpleEntity & {
  role_id: string;
  role_key: string | null;
  role_name: string | null;
  role_resource_type: string | null;
};

export function useUserEntities(userId: string | null) {
  // Query views directly - they return entities with role information
  const basesQ = useQuery({
    enabled: !!userId,
    queryKey: ['user-bases', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_bases')
        .select(
          'id,name,description,role_id,role_key,role_name,role_resource_type'
        );
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        description: r.description ?? undefined,
        role_id: String(r.role_id),
        role_key: r.role_key ?? null,
        role_name: r.role_name ?? null,
        role_resource_type: r.role_resource_type ?? null,
      })) as EntityWithRole[];
    },
  });

  const projectsQ = useQuery({
    enabled: !!userId,
    queryKey: ['user-projects', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_projects')
        .select(
          'id,name,description,role_id,role_key,role_name,role_resource_type'
        );
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        description: r.description ?? undefined,
        role_id: String(r.role_id),
        role_key: r.role_key ?? null,
        role_name: r.role_name ?? null,
        role_resource_type: r.role_resource_type ?? null,
      })) as EntityWithRole[];
    },
  });

  const partnersQ = useQuery({
    enabled: !!userId,
    queryKey: ['user-partner-orgs', userId],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_partner_orgs')
        .select(
          'id,name,description,role_id,role_key,role_name,role_resource_type'
        );
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        description: r.description ?? undefined,
        role_id: String(r.role_id),
        role_key: r.role_key ?? null,
        role_name: r.role_name ?? null,
        role_resource_type: r.role_resource_type ?? null,
      })) as EntityWithRole[];
    },
  });

  // Teams are no longer used, but keeping for backward compatibility
  const teamsQ = useQuery({
    enabled: false,
    queryKey: ['entities-teams'],
    staleTime: 300_000,
    queryFn: async () => [] as SimpleEntity[],
  });

  const isLoading =
    basesQ.isLoading ||
    projectsQ.isLoading ||
    partnersQ.isLoading ||
    teamsQ.isLoading;

  const loading = {
    roles: false, // No longer needed - roles are included in entities
    teams: teamsQ.isLoading,
    bases: basesQ.isLoading,
    projects: projectsQ.isLoading,
    partners: partnersQ.isLoading,
  };

  return {
    roles: [], // Deprecated - use role information from entities instead
    teams: teamsQ.data ?? [],
    bases: basesQ.data ?? [],
    projects: projectsQ.data ?? [],
    partners: partnersQ.data ?? [],
    isLoading,
    loading,
  };
}

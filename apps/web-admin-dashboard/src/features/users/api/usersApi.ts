import { supabase } from '@/shared/services/supabase';
import type {
  User,
  UserWithRoles,
  UserRoleAssignment,
  EntitySearchResult,
  RoleOption,
  UpdateUserData,
  ResourceType,
  Role,
} from '../types';

export const usersApi = {
  /**
   * Fetch paginated list of users with search
   */
  async fetchUsers(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }): Promise<{
    data: UserWithRoles[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error(error.message || 'Failed to fetch users');
    }

    // Fetch role counts for each user
    const usersWithRoleCounts = await Promise.all(
      (data || []).map(async user => {
        const { count: roleCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        return {
          ...user,
          role_count: roleCount || 0,
        };
      })
    );

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: usersWithRoleCounts,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single user with details
   */
  async fetchUserById(userId: string): Promise<UserWithRoles | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      throw new Error(error.message || 'Failed to fetch user');
    }

    if (!data) return null;

    // Fetch user roles
    const roles = await this.fetchUserRoles(userId);

    return {
      ...data,
      roles,
      role_count: roles.length,
    };
  },

  /**
   * Update user details
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    const { data: updated, error } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message || 'Failed to update user');
    }

    return updated;
  },

  /**
   * Fetch all role assignments for a user
   */
  async fetchUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(
        `
        *,
        roles (*)
      `
      )
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      throw new Error(error.message || 'Failed to fetch user roles');
    }

    // Fetch entity names for each role assignment
    const assignmentsWithEntityNames = await Promise.all(
      (data || []).map(async assignment => {
        let entityName: string | undefined;
        const roleData = assignment.roles as unknown as {
          id: string;
          name: string;
          role_key: string | null;
          resource_type: ResourceType | null;
          created_at: string | null;
          updated_at: string | null;
        };
        const role: Role = {
          id: roleData.id,
          name: roleData.name,
          role_key: roleData.role_key,
          resource_type: roleData.resource_type as ResourceType | null,
          created_at: roleData.created_at,
          updated_at: roleData.updated_at,
        };

        if (assignment.context_type && assignment.context_id) {
          switch (assignment.context_type) {
            case 'team': {
              const { data: team } = await supabase
                .from('teams')
                .select('name')
                .eq('id', assignment.context_id)
                .single();
              entityName = team?.name;
              break;
            }
            case 'base': {
              const { data: base } = await supabase
                .from('bases')
                .select('name')
                .eq('id', assignment.context_id)
                .single();
              entityName = base?.name;
              break;
            }
            case 'project': {
              const { data: project } = await supabase
                .from('projects')
                .select('name')
                .eq('id', assignment.context_id)
                .single();
              entityName = project?.name;
              break;
            }
            case 'partner': {
              const { data: partnerOrg } = await supabase
                .from('partner_orgs')
                .select('name')
                .eq('id', assignment.context_id)
                .single();
              entityName = partnerOrg?.name;
              break;
            }
          }
        }

        return {
          id: assignment.id,
          user_id: assignment.user_id,
          role_id: assignment.role_id,
          context_type: assignment.context_type,
          context_id: assignment.context_id,
          role: role,
          entity_name: entityName,
          entity_id: assignment.context_id || undefined,
        };
      })
    );

    return assignmentsWithEntityNames;
  },

  /**
   * Assign role to user
   */
  async assignUserRole(
    userId: string,
    roleId: string,
    contextType: string | null,
    contextId: string | null
  ): Promise<UserRoleAssignment> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        context_type: contextType,
        context_id: contextId,
      })
      .select(
        `
        *,
        roles (*)
      `
      )
      .single();

    if (error) {
      console.error('Error assigning user role:', error);
      throw new Error(error.message || 'Failed to assign user role');
    }

    const roleData = data.roles as unknown as {
      id: string;
      name: string;
      role_key: string | null;
      resource_type: ResourceType | null;
      created_at: string | null;
      updated_at: string | null;
    };
    const role: Role = {
      id: roleData.id,
      name: roleData.name,
      role_key: roleData.role_key,
      resource_type: roleData.resource_type,
      created_at: roleData.created_at,
      updated_at: roleData.updated_at,
    };
    return {
      id: data.id,
      user_id: data.user_id,
      role_id: data.role_id,
      context_type: data.context_type,
      context_id: data.context_id,
      role: role,
    };
  },

  /**
   * Remove role assignment
   */
  async removeUserRole(userRoleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userRoleId);

    if (error) {
      console.error('Error removing user role:', error);
      throw new Error(error.message || 'Failed to remove user role');
    }
  },

  /**
   * Search teams using ILIKE
   */
  async searchTeams(query: string, limit = 10): Promise<EntitySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from('teams')
      .select('id, name, type')
      .ilike('name', `%${query.trim()}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching teams:', error);
      throw new Error(error.message || 'Failed to search teams');
    }

    return (data || []).map(team => ({
      id: team.id,
      name: team.name,
      type: team.type || undefined,
    }));
  },

  /**
   * Search bases using ILIKE
   */
  async searchBases(query: string, limit = 10): Promise<EntitySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from('bases')
      .select('id, name')
      .ilike('name', `%${query.trim()}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching bases:', error);
      throw new Error(error.message || 'Failed to search bases');
    }

    return (data || []).map(base => ({
      id: base.id,
      name: base.name,
    }));
  },

  /**
   * Search projects using existing RPC
   */
  async searchProjects(
    query: string,
    limit = 10
  ): Promise<EntitySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: {
            search_query: string;
            max_results: number;
            min_similarity: number;
          }
        ) => Promise<{
          data: Array<{
            project_id: string;
            project_name: string;
            target_language_name: string | null;
          }> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc('search_projects', {
      search_query: query.trim(),
      max_results: limit,
      min_similarity: 0.1,
    });

    if (error) {
      console.error('Error searching projects:', error);
      throw new Error(error.message || 'Failed to search projects');
    }

    return (data || []).map(project => ({
      id: project.project_id,
      name: project.project_name,
      description: project.target_language_name || undefined,
    }));
  },

  /**
   * Search partner orgs using existing RPC
   */
  async searchPartnerOrgs(
    query: string,
    limit = 10
  ): Promise<EntitySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: {
            search_query: string;
            max_results: number;
          }
        ) => Promise<{
          data: Array<{
            id: string;
            name: string;
            description: string | null;
            similarity_score: number;
          }> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc('search_partner_orgs', {
      search_query: query.trim(),
      max_results: limit,
    });

    if (error) {
      console.error('Error searching partner orgs:', error);
      throw new Error(error.message || 'Failed to search partner orgs');
    }

    return (data || []).map(org => ({
      id: org.id,
      name: org.name,
      description: org.description,
      similarityScore: org.similarity_score,
    }));
  },

  /**
   * Fetch available roles for a resource type
   */
  async fetchRolesByResourceType(
    resourceType: ResourceType
  ): Promise<RoleOption[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, role_key, resource_type')
      .eq('resource_type', resourceType)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      throw new Error(error.message || 'Failed to fetch roles');
    }

    return (data || []).map(role => ({
      id: role.id,
      name: role.name,
      role_key: role.role_key,
      resource_type: role.resource_type,
    }));
  },

  /**
   * Search users by name or email
   */
  async searchUsers(query: string, limit = 10): Promise<EntitySearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .or(
        `first_name.ilike.%${query.trim()}%,last_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`
      )
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      throw new Error(error.message || 'Failed to search users');
    }

    return (data || []).map(user => ({
      id: user.id,
      name:
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        user.email ||
        'Unknown',
      description: user.email || undefined,
    }));
  },
};

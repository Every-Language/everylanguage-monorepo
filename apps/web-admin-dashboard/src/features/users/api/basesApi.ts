import { supabase } from '@/shared/services/supabase';
import type {
  Base,
  BaseWithAssignments,
  UserRoleAssignment,
  BaseTeamAssignment,
  CreateBaseData,
  UpdateBaseData,
  ResourceType,
} from '../types';

export const basesApi = {
  /**
   * Fetch paginated list of bases with search
   */
  async fetchBases(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }): Promise<{
    data: BaseWithAssignments[];
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
      .from('bases')
      .select(
        `
        *,
        regions (id, name)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching bases:', error);
      throw new Error(error.message || 'Failed to fetch bases');
    }

    // Fetch user and team counts for each base
    const basesWithCounts = await Promise.all(
      (data || []).map(async base => {
        const baseRegions = base.regions as unknown as {
          id: string;
          name: string;
        } | null;
        const [userCountResult, teamCountResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('context_type', 'base')
            .eq('context_id', base.id),
          supabase
            .from('bases_teams')
            .select('*', { count: 'exact', head: true })
            .eq('base_id', base.id)
            .is('unassigned_at', null),
        ]);

        return {
          ...base,
          region: baseRegions
            ? {
                id: baseRegions.id,
                name: baseRegions.name,
              }
            : null,
          user_count: userCountResult.count || 0,
          team_count: teamCountResult.count || 0,
        };
      })
    );

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: basesWithCounts,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single base with user and team assignments
   */
  async fetchBaseById(id: string): Promise<BaseWithAssignments | null> {
    const { data, error } = await supabase
      .from('bases')
      .select(
        `
        *,
        regions (id, name)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching base:', error);
      throw new Error(error.message || 'Failed to fetch base');
    }

    if (!data) return null;

    // Fetch user and team assignments
    const [users, teams] = await Promise.all([
      this.fetchBaseUsers(id),
      this.fetchBaseTeams(id),
    ]);

    const regions = data.regions as unknown as {
      id: string;
      name: string;
    } | null;
    return {
      ...data,
      region: regions
        ? {
            id: regions.id,
            name: regions.name,
          }
        : null,
      users,
      user_count: users.length,
      teams,
      team_count: teams.length,
    };
  },

  /**
   * Create new base
   */
  async createBase(data: CreateBaseData): Promise<Base> {
    // Convert location to PostGIS GeoJSON point format if provided
    let locationValue: unknown = null;
    if (data.location) {
      locationValue = {
        type: 'Point',
        coordinates: [data.location.lng, data.location.lat],
      };
    }

    const { data: created, error } = await supabase
      .from('bases')
      .insert({
        name: data.name,
        region_id: data.region_id || null,
        location: locationValue,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating base:', error);
      throw new Error(error.message || 'Failed to create base');
    }

    return created;
  },

  /**
   * Update base properties
   */
  async updateBase(id: string, data: UpdateBaseData): Promise<Base> {
    const updateData: {
      updated_at: string;
      name?: string;
      region_id?: string | null;
      location?: { type: string; coordinates: number[] } | null;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.region_id !== undefined) {
      updateData.region_id = data.region_id;
    }
    if (data.location !== undefined) {
      if (data.location) {
        updateData.location = {
          type: 'Point',
          coordinates: [data.location.lng, data.location.lat],
        };
      } else {
        updateData.location = null;
      }
    }

    const { data: updated, error } = await supabase
      .from('bases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating base:', error);
      throw new Error(error.message || 'Failed to update base');
    }

    return updated;
  },

  /**
   * Soft delete base
   */
  async deleteBase(id: string): Promise<void> {
    const { error } = await supabase.from('bases').delete().eq('id', id);

    if (error) {
      console.error('Error deleting base:', error);
      throw new Error(error.message || 'Failed to delete base');
    }
  },

  /**
   * Fetch users assigned to base
   */
  async fetchBaseUsers(baseId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(
        `
        *,
        roles (*),
        users (*)
      `
      )
      .eq('context_type', 'base')
      .eq('context_id', baseId);

    if (error) {
      console.error('Error fetching base users:', error);
      throw new Error(error.message || 'Failed to fetch base users');
    }

    return (data || []).map(assignment => {
      const role = assignment.roles as unknown as {
        id: string;
        name: string;
        role_key: string | null;
        resource_type: ResourceType | null;
        created_at: string | null;
        updated_at: string | null;
      };
      const user = assignment.users as unknown as {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
      return {
        id: assignment.id,
        user_id: assignment.user_id,
        role_id: assignment.role_id,
        context_type: assignment.context_type,
        context_id: assignment.context_id,
        role: {
          id: role.id,
          name: role.name,
          role_key: role.role_key,
          resource_type: role.resource_type as ResourceType | null,
          created_at: role.created_at,
          updated_at: role.updated_at,
        },
        entity_name: user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            user.email ||
            'Unknown'
          : undefined,
        user_email: user?.email || undefined,
        user_name: user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            undefined
          : undefined,
      };
    });
  },

  /**
   * Assign user to base with role
   */
  async assignUserToBase(
    baseId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        context_type: 'base',
        context_id: baseId,
      })
      .select(
        `
        *,
        roles (*),
        users (*)
      `
      )
      .single();

    if (error) {
      console.error('Error assigning user to base:', error);
      throw new Error(error.message || 'Failed to assign user to base');
    }

    const role = data.roles as unknown as {
      id: string;
      name: string;
      role_key: string | null;
      resource_type: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    const user = data.users as unknown as {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    return {
      id: data.id,
      user_id: data.user_id,
      role_id: data.role_id,
      context_type: data.context_type,
      context_id: data.context_id,
      role: {
        id: role.id,
        name: role.name,
        role_key: role.role_key,
        resource_type: role.resource_type as ResourceType | null,
        created_at: role.created_at,
        updated_at: role.updated_at,
      },
      entity_name: user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          user.email ||
          'Unknown'
        : undefined,
      user_email: user?.email || undefined,
      user_name: user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined
        : undefined,
    };
  },

  /**
   * Remove user assignment from base
   */
  async removeUserFromBase(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing user from base:', error);
      throw new Error(error.message || 'Failed to remove user from base');
    }
  },

  /**
   * Fetch teams assigned to base
   */
  async fetchBaseTeams(baseId: string): Promise<BaseTeamAssignment[]> {
    const { data, error } = await supabase
      .from('bases_teams')
      .select(
        `
        *,
        teams (*),
        roles (*)
      `
      )
      .eq('base_id', baseId)
      .is('unassigned_at', null);

    if (error) {
      console.error('Error fetching base teams:', error);
      throw new Error(error.message || 'Failed to fetch base teams');
    }

    return (data || []).map(assignment => {
      const team = assignment.teams as unknown as {
        id: string;
        name: string;
        type: string | null;
        created_at: string | null;
        updated_at: string | null;
        created_by: string | null;
      } | null;
      const role = assignment.roles as unknown as {
        id: string;
        name: string;
        role_key: string | null;
        resource_type: string | null;
        created_at: string | null;
        updated_at: string | null;
      } | null;
      return {
        id: assignment.id,
        team_id: assignment.team_id,
        base_id: assignment.base_id,
        role_id: assignment.role_id,
        assigned_at: assignment.assigned_at,
        unassigned_at: assignment.unassigned_at,
        team: team
          ? {
              id: team.id,
              name: team.name,
              type: team.type,
              created_at: team.created_at,
              updated_at: team.updated_at,
              created_by: team.created_by,
            }
          : undefined,
        role: role
          ? {
              id: role.id,
              name: role.name,
              role_key: role.role_key,
              resource_type: role.resource_type as ResourceType | null,
              created_at: role.created_at,
              updated_at: role.updated_at,
            }
          : undefined,
      };
    });
  },

  /**
   * Assign team to base with role
   */
  async assignTeamToBase(
    baseId: string,
    teamId: string,
    roleId: string
  ): Promise<BaseTeamAssignment> {
    const { data, error } = await supabase
      .from('bases_teams')
      .insert({
        team_id: teamId,
        base_id: baseId,
        role_id: roleId,
        assigned_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        teams (*),
        roles (*)
      `
      )
      .single();

    if (error) {
      console.error('Error assigning team to base:', error);
      throw new Error(error.message || 'Failed to assign team to base');
    }

    const team = data.teams as unknown as {
      id: string;
      name: string;
      type: string | null;
      created_at: string | null;
      updated_at: string | null;
      created_by: string | null;
    } | null;
    const role = data.roles as unknown as {
      id: string;
      name: string;
      role_key: string | null;
      resource_type: string | null;
      created_at: string | null;
      updated_at: string | null;
    } | null;
    return {
      id: data.id,
      team_id: data.team_id,
      base_id: data.base_id,
      role_id: data.role_id,
      assigned_at: data.assigned_at,
      unassigned_at: data.unassigned_at,
      team: team
        ? {
            id: team.id,
            name: team.name,
            type: team.type,
            created_at: team.created_at,
            updated_at: team.updated_at,
            created_by: team.created_by,
          }
        : undefined,
      role: role
        ? {
            id: role.id,
            name: role.name,
            role_key: role.role_key,
            resource_type: role.resource_type as ResourceType | null,
            created_at: role.created_at,
            updated_at: role.updated_at,
          }
        : undefined,
    };
  },

  /**
   * Remove team-base assignment
   */
  async removeTeamFromBase(assignmentId: string): Promise<void> {
    // Soft delete by setting unassigned_at
    const { error } = await supabase
      .from('bases_teams')
      .update({
        unassigned_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing team from base:', error);
      throw new Error(error.message || 'Failed to remove team from base');
    }
  },
};

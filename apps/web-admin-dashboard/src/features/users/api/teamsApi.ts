import { supabase } from '@/shared/services/supabase';
import type {
  Team,
  TeamWithAssignments,
  UserRoleAssignment,
  BaseTeamAssignment,
  CreateTeamData,
  UpdateTeamData,
  ResourceType,
} from '../types';

export const teamsApi = {
  /**
   * Fetch paginated list of teams with search
   */
  async fetchTeams(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  }): Promise<{
    data: TeamWithAssignments[];
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
      .from('teams')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.or(`name.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching teams:', error);
      throw new Error(error.message || 'Failed to fetch teams');
    }

    // Fetch user and base counts for each team
    const teamsWithCounts = await Promise.all(
      (data || []).map(async team => {
        const [userCountResult, baseCountResult] = await Promise.all([
          supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('context_type', 'team')
            .eq('context_id', team.id),
          supabase
            .from('bases_teams')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .is('unassigned_at', null),
        ]);

        return {
          ...team,
          user_count: userCountResult.count || 0,
          base_count: baseCountResult.count || 0,
        };
      })
    );

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: teamsWithCounts,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single team with user and base assignments
   */
  async fetchTeamById(id: string): Promise<TeamWithAssignments | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching team:', error);
      throw new Error(error.message || 'Failed to fetch team');
    }

    if (!data) return null;

    // Fetch user and base assignments
    const [users, bases] = await Promise.all([
      this.fetchTeamUsers(id),
      this.fetchTeamBases(id),
    ]);

    return {
      ...data,
      users,
      user_count: users.length,
      bases,
      base_count: bases.length,
    };
  },

  /**
   * Create new team
   */
  async createTeam(data: CreateTeamData): Promise<Team> {
    const { data: created, error } = await supabase
      .from('teams')
      .insert({
        name: data.name,
        type: data.type || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      throw new Error(error.message || 'Failed to create team');
    }

    return created;
  },

  /**
   * Update team properties
   */
  async updateTeam(id: string, data: UpdateTeamData): Promise<Team> {
    const { data: updated, error } = await supabase
      .from('teams')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating team:', error);
      throw new Error(error.message || 'Failed to update team');
    }

    return updated;
  },

  /**
   * Soft delete team
   */
  async deleteTeam(id: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id);

    if (error) {
      console.error('Error deleting team:', error);
      throw new Error(error.message || 'Failed to delete team');
    }
  },

  /**
   * Fetch users assigned to team
   */
  async fetchTeamUsers(teamId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(
        `
        *,
        roles (*),
        users (*)
      `
      )
      .eq('context_type', 'team')
      .eq('context_id', teamId);

    if (error) {
      console.error('Error fetching team users:', error);
      throw new Error(error.message || 'Failed to fetch team users');
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
   * Assign user to team with role
   */
  async assignUserToTeam(
    teamId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        context_type: 'team',
        context_id: teamId,
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
      console.error('Error assigning user to team:', error);
      throw new Error(error.message || 'Failed to assign user to team');
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
   * Remove user assignment from team
   */
  async removeUserFromTeam(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing user from team:', error);
      throw new Error(error.message || 'Failed to remove user from team');
    }
  },

  /**
   * Fetch bases assigned to team
   */
  async fetchTeamBases(teamId: string): Promise<BaseTeamAssignment[]> {
    const { data, error } = await supabase
      .from('bases_teams')
      .select(
        `
        *,
        bases (*),
        roles (*)
      `
      )
      .eq('team_id', teamId)
      .is('unassigned_at', null);

    if (error) {
      console.error('Error fetching team bases:', error);
      throw new Error(error.message || 'Failed to fetch team bases');
    }

    return (data || []).map(assignment => {
      const base = assignment.bases as unknown as {
        id: string;
        name: string;
        region_id: string | null;
        location: unknown;
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
        base: base
          ? {
              id: base.id,
              name: base.name,
              region_id: base.region_id,
              location: base.location,
              created_at: base.created_at,
              updated_at: base.updated_at,
              created_by: base.created_by,
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
    teamId: string,
    baseId: string,
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
        bases (*),
        roles (*)
      `
      )
      .single();

    if (error) {
      console.error('Error assigning team to base:', error);
      throw new Error(error.message || 'Failed to assign team to base');
    }

    const base = data.bases as unknown as {
      id: string;
      name: string;
      region_id: string | null;
      location: unknown;
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
      base: base
        ? {
            id: base.id,
            name: base.name,
            region_id: base.region_id,
            location: base.location,
            created_at: base.created_at,
            updated_at: base.updated_at,
            created_by: base.created_by,
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

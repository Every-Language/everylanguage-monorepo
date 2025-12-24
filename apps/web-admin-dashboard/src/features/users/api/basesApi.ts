import { supabase } from '@/shared/services/supabase';
import type {
  Base,
  BaseWithAssignments,
  UserRoleAssignment,
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
      .select('*', { count: 'exact' })
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

    // Collect unique region IDs
    const regionIds = [
      ...new Set(
        (data || [])
          .map(base => base.region_id)
          .filter((id): id is string => id !== null)
      ),
    ];

    // Fetch all regions in one query
    const regionsMap = new Map<string, { id: string; name: string }>();
    if (regionIds.length > 0) {
      const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name')
        .in('id', regionIds);

      if (!regionsError && regions) {
        regions.forEach(region => {
          regionsMap.set(region.id, { id: region.id, name: region.name });
        });
      }
    }

    // Map bases with their regions
    const basesWithRegions = (data || []).map(base => ({
      ...base,
      region: base.region_id ? regionsMap.get(base.region_id) || null : null,
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: basesWithRegions,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single base with user assignments
   */
  async fetchBaseById(id: string): Promise<BaseWithAssignments | null> {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching base:', error);
      throw new Error(error.message || 'Failed to fetch base');
    }

    if (!data) return null;

    // Fetch region if region_id exists
    let region: { id: string; name: string } | null = null;
    if (data.region_id) {
      const { data: regionData } = await supabase
        .from('regions')
        .select('id, name')
        .eq('id', data.region_id)
        .single();

      if (regionData) {
        region = { id: regionData.id, name: regionData.name };
      }
    }

    // Fetch user assignments
    const users = await this.fetchBaseUsers(id);

    return {
      ...data,
      region,
      users,
      user_count: users.length,
    };
  },

  /**
   * Create new base
   */
  async createBase(data: CreateBaseData): Promise<Base> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'basesApi.ts:136',
        message: 'createBase called',
        data: { name: data.name, region_id: data.region_id },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion
    // Convert location to PostgreSQL point format (x,y) if provided
    let locationValue: string | null = null;
    if (data.location) {
      // PostgreSQL point type expects format: (x,y) as a string
      locationValue = `(${data.location.lng},${data.location.lat})`;
    }

    // #region agent log
    const { data: userData } = await supabase.auth.getUser();
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'basesApi.ts:149',
        message: 'User auth check',
        data: { userId: userData?.user?.id, email: userData?.user?.email },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    const insertData = {
      name: data.name,
      region_id: data.region_id || null,
      location: locationValue,
      is_public: data.is_public ?? false,
      created_by: userData?.user?.id || null,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'basesApi.ts:157',
        message: 'Insert data prepared',
        data: insertData,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    const { data: created, error } = await supabase
      .from('bases')
      .insert(insertData)
      .select()
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'basesApi.ts:165',
        message: 'Insert result',
        data: { success: !error, error: error?.message, code: error?.code },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

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
      location?: string | null;
      is_public?: boolean;
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
        // PostgreSQL point type expects format: (x,y) as a string
        updateData.location = `(${data.location.lng},${data.location.lat})`;
      } else {
        updateData.location = null;
      }
    }
    if (data.is_public !== undefined) {
      updateData.is_public = data.is_public;
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
   * Uses direct query now that RLS recursion is fixed
   */
  async fetchBaseUsers(baseId: string): Promise<UserRoleAssignment[]> {
    const { data: members, error } = await supabase
      .from('user_roles')
      .select(
        `
        id,
        user_id,
        role_id,
        user:users!user_roles_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        role:roles!user_roles_role_id_fkey (
          id,
          name,
          role_key,
          resource_type
        )
      `
      )
      .eq('base_id', baseId)
      .not('base_id', 'is', null);

    if (error) {
      console.error('Error fetching base users:', error);
      throw new Error(error.message || 'Failed to fetch base users');
    }

    if (!members || members.length === 0) {
      return [];
    }

    type MemberRow = {
      id: string;
      user_id: string;
      role_id: string | null;
      user: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
      role: {
        id: string;
        name: string;
        role_key: string | null;
        resource_type: string | null;
      } | null;
    };

    return members.map((member: MemberRow) => {
      const user = member.user;
      const role = member.role;
      const userFullName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || null
        : null;

      return {
        id: member.id || '',
        user_id: member.user_id,
        role_id: member.role_id || '',
        project_id: null,
        base_id: baseId,
        partner_org_id: null,
        is_global: false,
        role: role
          ? {
              id: role.id || '',
              name: role.name || '',
              role_key: role.role_key || null,
              resource_type: (role.resource_type as ResourceType) || null,
              created_at: null,
              updated_at: null,
            }
          : {
              id: '',
              name: '',
              role_key: null,
              resource_type: null,
              created_at: null,
              updated_at: null,
            },
        entity_name: userFullName || user?.email || 'Unknown',
        user_email: user?.email || undefined,
        user_name: userFullName || undefined,
      };
    });
  },

  /**
   * Assign user to base with role (UPSERT pattern)
   * With one-role-per-entity constraint, this will replace any existing role for the base
   */
  async assignUserToBase(
    baseId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    // Check if user already has a role for this base
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('base_id', baseId)
      .not('base_id', 'is', null)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing role
      const { data, error } = await supabase
        .from('user_roles')
        .update({
          role_id: roleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select(
          `
          *,
          roles (*),
          users (*)
        `
        )
        .single();

      if (error) {
        console.error('Error updating user role in base:', error);
        throw new Error(error.message || 'Failed to update user role in base');
      }
      result = data;
    } else {
      // Insert new role (trigger will handle if duplicate exists)
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          base_id: baseId,
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
      result = data;
    }

    const role = result.roles as unknown as {
      id: string;
      name: string;
      role_key: string | null;
      resource_type: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    const user = result.users as unknown as {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
    return {
      id: result.id,
      user_id: result.user_id,
      role_id: result.role_id,
      project_id: result.project_id,
      base_id: result.base_id,
      partner_org_id: result.partner_org_id,
      is_global: result.is_global,
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
   * Fetch projects assigned to base
   */
  async fetchBaseProjects(baseId: string): Promise<
    Array<{
      id: string;
      project_id: string;
      project_name: string;
      language_name: string | null;
      project_status: string | null;
    }>
  > {
    const { data, error } = await supabase
      .from('bases_projects')
      .select(
        `
        id,
        project_id,
        project:projects (
          name,
          target_language_entity_id,
          project_status,
          target_language:language_entities!projects_target_language_entity_id_fkey (
            name
          )
        )
      `
      )
      .eq('base_id', baseId)
      .is('unassigned_at', null);

    if (error) {
      console.error('Error fetching base projects:', error);
      throw new Error(error.message || 'Failed to fetch base projects');
    }

    type BaseProjectRow = {
      id: string;
      project_id: string;
      project: {
        name: string;
        target_language: {
          name: string;
        } | null;
        project_status: string | null;
      } | null;
    };

    return (data || []).map((row: BaseProjectRow) => ({
      id: row.id,
      project_id: row.project_id,
      project_name: row.project?.name || '',
      language_name: row.project?.target_language?.name || null,
      project_status: row.project?.project_status || null,
    }));
  },

  /**
   * Assign project to base
   */
  async assignProjectToBase(baseId: string, projectId: string): Promise<void> {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('bases_projects')
      .select('id')
      .eq('base_id', baseId)
      .eq('project_id', projectId)
      .is('unassigned_at', null)
      .maybeSingle();

    if (existing) {
      // Already assigned, do nothing
      return;
    }

    // Check if there's an unassigned entry to reactivate
    const { data: unassigned } = await supabase
      .from('bases_projects')
      .select('id')
      .eq('base_id', baseId)
      .eq('project_id', projectId)
      .not('unassigned_at', 'is', null)
      .maybeSingle();

    if (unassigned) {
      // Reactivate by clearing unassigned_at
      const { error } = await supabase
        .from('bases_projects')
        .update({ unassigned_at: null })
        .eq('id', unassigned.id);

      if (error) {
        console.error('Error reactivating base project:', error);
        throw new Error(error.message || 'Failed to assign project to base');
      }
    } else {
      // Create new assignment
      const { error } = await supabase.from('bases_projects').insert({
        base_id: baseId,
        project_id: projectId,
      });

      if (error) {
        console.error('Error assigning project to base:', error);
        throw new Error(error.message || 'Failed to assign project to base');
      }
    }
  },

  /**
   * Unassign project from base (soft delete)
   */
  async unassignProjectFromBase(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('bases_projects')
      .update({ unassigned_at: new Date().toISOString() })
      .eq('id', assignmentId);

    if (error) {
      console.error('Error unassigning project from base:', error);
      throw new Error(error.message || 'Failed to unassign project from base');
    }
  },
};

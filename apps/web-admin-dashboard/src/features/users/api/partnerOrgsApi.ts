import { supabase } from '@/shared/services/supabase';
import type {
  PartnerOrg,
  PartnerOrgWithUsers,
  UserRoleAssignment,
  CreatePartnerOrgData,
  UpdatePartnerOrgData,
  ResourceType,
} from '../types';

export const partnerOrgsApi = {
  /**
   * Fetch paginated list of partner orgs with search
   */
  async fetchPartnerOrgs(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    includeIndividual?: boolean;
    isPublic?: boolean | null;
  }): Promise<{
    data: PartnerOrgWithUsers[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    console.log('[fetchPartnerOrgs] Params:', {
      includeIndividual: params?.includeIndividual,
      isPublic: params?.isPublic,
      searchQuery: params?.searchQuery,
    });

    let query = supabase
      .from('partner_orgs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search if provided
    if (params?.searchQuery && params.searchQuery.trim().length >= 2) {
      const searchTerm = params.searchQuery.trim();
      query = query.or(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Apply individual filter
    // Default behavior: exclude individual orgs unless explicitly included
    if (params?.includeIndividual !== true) {
      console.log('[fetchPartnerOrgs] Filtering out individual orgs');
      query = query.eq('is_individual', false);
    } else {
      console.log('[fetchPartnerOrgs] Including individual orgs');
    }

    // Apply public filter
    if (params?.isPublic !== null && params?.isPublic !== undefined) {
      query = query.eq('is_public', params.isPublic);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('[fetchPartnerOrgs] Error fetching partner orgs:', error);
      throw new Error(error.message || 'Failed to fetch partner orgs');
    }

    console.log('[fetchPartnerOrgs] Fetched orgs:', {
      count: data?.length || 0,
      totalCount: count,
      sampleOrg: data?.[0]
        ? {
            id: data[0].id,
            name: data[0].name,
            is_individual: data[0].is_individual,
          }
        : null,
    });

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: data || [],
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch single partner org with user assignments
   */
  async fetchPartnerOrgById(id: string): Promise<PartnerOrgWithUsers | null> {
    const { data, error } = await supabase
      .from('partner_orgs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching partner org:', error);
      throw new Error(error.message || 'Failed to fetch partner org');
    }

    if (!data) return null;

    // Fetch user assignments
    const users = await this.fetchPartnerOrgUsers(id);

    return {
      ...data,
      users,
      user_count: users.length,
    };
  },

  /**
   * Create new partner org
   */
  async createPartnerOrg(data: CreatePartnerOrgData): Promise<PartnerOrg> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'partnerOrgsApi.ts:121',
        message: 'createPartnerOrg called',
        data: { name: data.name },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    // #region agent log
    const { data: userData } = await supabase.auth.getUser();
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'partnerOrgsApi.ts:125',
        message: 'User auth check',
        data: { userId: userData?.user?.id, email: userData?.user?.email },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    const insertData = {
      name: data.name,
      description: data.description || null,
      is_public: data.is_public ?? false,
      is_individual: data.is_individual ?? false,
      created_by: userData?.user?.id || null,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'partnerOrgsApi.ts:133',
        message: 'Insert data prepared',
        data: insertData,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    const { data: created, error } = await supabase
      .from('partner_orgs')
      .insert(insertData)
      .select()
      .single();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'partnerOrgsApi.ts:141',
        message: 'Insert result',
        data: { success: !error, error: error?.message, code: error?.code },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion

    if (error) {
      console.error('Error creating partner org:', error);
      throw new Error(error.message || 'Failed to create partner org');
    }

    return created;
  },

  /**
   * Update partner org properties
   */
  async updatePartnerOrg(
    id: string,
    data: UpdatePartnerOrgData
  ): Promise<PartnerOrg> {
    const { data: updated, error } = await supabase
      .from('partner_orgs')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating partner org:', error);
      throw new Error(error.message || 'Failed to update partner org');
    }

    return updated;
  },

  /**
   * Soft delete partner org
   */
  async deletePartnerOrg(id: string): Promise<void> {
    // Note: If there's a deleted_at column, use that instead
    const { error } = await supabase.from('partner_orgs').delete().eq('id', id);

    if (error) {
      console.error('Error deleting partner org:', error);
      throw new Error(error.message || 'Failed to delete partner org');
    }
  },

  /**
   * Fetch users assigned to partner org
   * Uses direct query now that RLS recursion is fixed
   */
  async fetchPartnerOrgUsers(
    partnerOrgId: string
  ): Promise<UserRoleAssignment[]> {
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
      .eq('partner_org_id', partnerOrgId)
      .not('partner_org_id', 'is', null);

    if (error) {
      console.error('Error fetching partner org users:', error);
      throw new Error(error.message || 'Failed to fetch partner org users');
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
        base_id: null,
        partner_org_id: partnerOrgId,
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
   * Assign user to partner org with role (UPSERT pattern)
   * With one-role-per-entity constraint, this will replace any existing role for the partner org
   */
  async assignUserToPartnerOrg(
    partnerOrgId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    // Check if user already has a role for this partner org
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('partner_org_id', partnerOrgId)
      .not('partner_org_id', 'is', null)
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
        console.error('Error updating user role in partner org:', error);
        throw new Error(
          error.message || 'Failed to update user role in partner org'
        );
      }
      result = data;
    } else {
      // Insert new role (trigger will handle if duplicate exists)
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId,
          partner_org_id: partnerOrgId,
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
        console.error('Error assigning user to partner org:', error);
        throw new Error(
          error.message || 'Failed to assign user to partner org'
        );
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
   * Remove user assignment from partner org
   */
  async removeUserFromPartnerOrg(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error removing user from partner org:', error);
      throw new Error(
        error.message || 'Failed to remove user from partner org'
      );
    }
  },

  /**
   * Fetch projects assigned to partner org
   */
  async fetchPartnerOrgProjects(partnerOrgId: string): Promise<
    Array<{
      id: string;
      project_id: string;
      project_name: string;
      language_name: string | null;
      project_status: string | null;
    }>
  > {
    const { data, error } = await supabase
      .from('partner_orgs_projects')
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
      .eq('partner_org_id', partnerOrgId)
      .is('unassigned_at', null);

    if (error) {
      console.error('Error fetching partner org projects:', error);
      throw new Error(error.message || 'Failed to fetch partner org projects');
    }

    type PartnerOrgProjectRow = {
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

    return ((data || []) as unknown as PartnerOrgProjectRow[]).map(row => ({
      id: row.id,
      project_id: row.project_id,
      project_name: row.project?.name || '',
      language_name: row.project?.target_language?.name || null,
      project_status: row.project?.project_status || null,
    }));
  },

  /**
   * Assign project to partner org
   */
  async assignProjectToPartnerOrg(
    partnerOrgId: string,
    projectId: string
  ): Promise<void> {
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('partner_orgs_projects')
      .select('id')
      .eq('partner_org_id', partnerOrgId)
      .eq('project_id', projectId)
      .is('unassigned_at', null)
      .maybeSingle();

    if (existing) {
      // Already assigned, do nothing
      return;
    }

    // Check if there's an unassigned entry to reactivate
    const { data: unassigned } = await supabase
      .from('partner_orgs_projects')
      .select('id')
      .eq('partner_org_id', partnerOrgId)
      .eq('project_id', projectId)
      .not('unassigned_at', 'is', null)
      .maybeSingle();

    if (unassigned) {
      // Reactivate by clearing unassigned_at
      const unassignedId = (unassigned as unknown as { id: string }).id;
      const { error } = await supabase
        .from('partner_orgs_projects')
        .update({ unassigned_at: null } as never)
        .eq('id', unassignedId);

      if (error) {
        console.error('Error reactivating partner org project:', error);
        throw new Error(
          error.message || 'Failed to assign project to partner org'
        );
      }
    } else {
      // Create new assignment
      const { error } = await supabase.from('partner_orgs_projects').insert({
        partner_org_id: partnerOrgId,
        project_id: projectId,
        source_type: 'manual',
      } as never);

      if (error) {
        console.error('Error assigning project to partner org:', error);
        throw new Error(
          error.message || 'Failed to assign project to partner org'
        );
      }
    }
  },

  /**
   * Unassign project from partner org (soft delete)
   */
  async unassignProjectFromPartnerOrg(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('partner_orgs_projects')
      .update({ unassigned_at: new Date().toISOString() } as never)
      .eq('id', assignmentId);

    if (error) {
      console.error('Error unassigning project from partner org:', error);
      throw new Error(
        error.message || 'Failed to unassign project from partner org'
      );
    }
  },
};

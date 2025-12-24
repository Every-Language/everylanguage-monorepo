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
  CreateUserData,
  AuthStatus,
} from '../types';

export const usersApi = {
  /**
   * Fetch paginated list of users with search
   * Uses get_all_users RPC function to bypass RLS and get users with their roles
   */
  async fetchUsers(params?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    includeAnonymous?: boolean;
  }): Promise<{
    data: UserWithRoles[];
    count: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const searchQuery = params?.searchQuery?.trim() || null;

    // Call RPC function to get users with nested user_roles
    const { data: rpcData, error: rpcError } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: {
            p_page: number;
            p_page_size: number;
            p_search_query: string | null;
            p_include_anonymous: boolean;
          }
        ) => Promise<{
          data: Array<{
            user_id: string;
            first_name: string | null;
            last_name: string | null;
            email: string | null;
            phone_number: string | null;
            created_at: string;
            updated_at: string | null;
            is_anonymous: boolean;
            user_roles: Array<{
              id: string;
              user_id: string;
              role_id: string;
              base_id: string | null;
              project_id: string | null;
              partner_org_id: string | null;
              is_global: boolean;
              created_at: string;
              updated_at: string | null;
              role: {
                id: string;
                name: string;
                role_key: string | null;
                resource_type: string | null;
              };
            }>;
            total_count: number;
          }> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc('get_all_users', {
      p_page: page,
      p_page_size: pageSize,
      p_search_query:
        searchQuery && searchQuery.length >= 2 ? searchQuery : null,
      p_include_anonymous: params?.includeAnonymous ?? false,
    });

    if (rpcError) {
      console.error('Error fetching users:', rpcError);
      throw new Error(rpcError.message || 'Failed to fetch users');
    }

    if (!rpcData || rpcData.length === 0) {
      const totalCount = 0;
      return {
        data: [],
        count: totalCount,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    // Extract all unique entity IDs from user_roles
    const baseIds = new Set<string>();
    const projectIds = new Set<string>();
    const partnerOrgIds = new Set<string>();

    rpcData.forEach(user => {
      user.user_roles.forEach(role => {
        if (role.base_id) baseIds.add(role.base_id);
        if (role.project_id) projectIds.add(role.project_id);
        if (role.partner_org_id) partnerOrgIds.add(role.partner_org_id);
      });
    });

    // Batch query entities (3 queries total, regardless of user count)
    const [basesResult, projectsResult, partnerOrgsResult] = await Promise.all([
      baseIds.size > 0
        ? supabase
            .from('bases')
            .select('id, name')
            .in('id', Array.from(baseIds))
        : { data: [], error: null },
      projectIds.size > 0
        ? supabase
            .from('projects')
            .select('id, name')
            .in('id', Array.from(projectIds))
        : { data: [], error: null },
      partnerOrgIds.size > 0
        ? supabase
            .from('partner_orgs')
            .select('id, name')
            .in('id', Array.from(partnerOrgIds))
        : { data: [], error: null },
    ]);

    if (basesResult.error) {
      console.error('Error fetching bases:', basesResult.error);
    }
    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error);
    }
    if (partnerOrgsResult.error) {
      console.error('Error fetching partner orgs:', partnerOrgsResult.error);
    }

    // Create lookup maps for entity names
    const baseMap = new Map((basesResult.data || []).map(b => [b.id, b.name]));
    const projectMap = new Map(
      (projectsResult.data || []).map(p => [p.id, p.name])
    );
    const partnerOrgMap = new Map(
      (partnerOrgsResult.data || []).map(po => [po.id, po.name])
    );

    // Get total count from first user (all users have the same total_count)
    const totalCount = rpcData[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Map RPC response to UserWithRoles format
    const users: UserWithRoles[] = rpcData.map(user => {
      // Map user_roles to UserRoleAssignment format
      const roles: UserRoleAssignment[] = user.user_roles.map(role => {
        let entityName: string | undefined;
        let entityId: string | undefined;

        if (role.base_id) {
          entityName = baseMap.get(role.base_id);
          entityId = role.base_id;
        } else if (role.project_id) {
          entityName = projectMap.get(role.project_id);
          entityId = role.project_id;
        } else if (role.partner_org_id) {
          entityName = partnerOrgMap.get(role.partner_org_id);
          entityId = role.partner_org_id;
        }

        return {
          id: role.id,
          user_id: role.user_id,
          role_id: role.role_id,
          project_id: role.project_id,
          base_id: role.base_id,
          partner_org_id: role.partner_org_id,
          is_global: role.is_global,
          role: {
            id: role.role.id,
            name: role.role.name,
            role_key: role.role.role_key,
            resource_type: role.role.resource_type as ResourceType | null,
            created_at: null,
            updated_at: null,
          },
          entity_name: entityName,
          entity_id: entityId,
        };
      });

      return {
        id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        created_at: user.created_at,
        updated_at: user.updated_at,
        is_anonymous: user.is_anonymous,
        roles,
        role_count: roles.length,
      };
    });

    // Note: Anonymous filtering is now handled in the database function
    // No need to filter here as it's already done before pagination

    return {
      data: users,
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

        let entityId: string | undefined;
        if (assignment.base_id) {
          const { data: base } = await supabase
            .from('bases')
            .select('name')
            .eq('id', assignment.base_id)
            .single();
          entityName = base?.name;
          entityId = assignment.base_id;
        } else if (assignment.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', assignment.project_id)
            .single();
          entityName = project?.name;
          entityId = assignment.project_id;
        } else if (assignment.partner_org_id) {
          const { data: partnerOrg } = await supabase
            .from('partner_orgs')
            .select('name')
            .eq('id', assignment.partner_org_id)
            .single();
          entityName = partnerOrg?.name;
          entityId = assignment.partner_org_id;
        }

        return {
          id: assignment.id,
          user_id: assignment.user_id,
          role_id: assignment.role_id,
          project_id: assignment.project_id,
          base_id: assignment.base_id,
          partner_org_id: assignment.partner_org_id,
          is_global: assignment.is_global,
          role: role,
          entity_name: entityName,
          entity_id: entityId,
        };
      })
    );

    return assignmentsWithEntityNames;
  },

  /**
   * Assign role to user (UPSERT pattern - updates existing role or inserts new one)
   * With one-role-per-entity constraint, this will replace any existing role for the entity
   */
  async assignUserRole(
    userId: string,
    roleId: string,
    context: {
      projectId?: string | null;
      baseId?: string | null;
      partnerOrgId?: string | null;
      isGlobal?: boolean;
    }
  ): Promise<UserRoleAssignment> {
    // Determine which entity field to check
    let existingQuery = supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId);

    if (context.isGlobal) {
      existingQuery = existingQuery.eq('is_global', true);
    } else if (context.projectId) {
      existingQuery = existingQuery
        .eq('project_id', context.projectId)
        .not('project_id', 'is', null);
    } else if (context.baseId) {
      existingQuery = existingQuery
        .eq('base_id', context.baseId)
        .not('base_id', 'is', null);
    } else if (context.partnerOrgId) {
      existingQuery = existingQuery
        .eq('partner_org_id', context.partnerOrgId)
        .not('partner_org_id', 'is', null);
    } else {
      throw new Error(
        'Must provide projectId, baseId, partnerOrgId, or isGlobal'
      );
    }

    const { data: existing } = await existingQuery.maybeSingle();

    const updateData: {
      user_id: string;
      role_id: string;
      project_id?: string | null;
      base_id?: string | null;
      partner_org_id?: string | null;
      is_global?: boolean;
      updated_at?: string;
    } = {
      user_id: userId,
      role_id: roleId,
    };

    if (context.isGlobal) {
      updateData.is_global = true;
    } else if (context.projectId) {
      updateData.project_id = context.projectId;
    } else if (context.baseId) {
      updateData.base_id = context.baseId;
    } else if (context.partnerOrgId) {
      updateData.partner_org_id = context.partnerOrgId;
    }

    let result;
    if (existing) {
      // Update existing role
      updateData.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_roles')
        .update(updateData)
        .eq('id', existing.id)
        .select(
          `
          *,
          roles (*)
        `
        )
        .single();

      if (error) {
        console.error('Error updating user role:', error);
        throw new Error(error.message || 'Failed to update user role');
      }
      result = data;
    } else {
      // Insert new role (trigger will handle if duplicate exists)
      const { data, error } = await supabase
        .from('user_roles')
        .insert(updateData)
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
      result = data;
    }

    const roleData = result.roles as unknown as {
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
      id: result.id,
      user_id: result.user_id,
      role_id: result.role_id,
      project_id: result.project_id,
      base_id: result.base_id,
      partner_org_id: result.partner_org_id,
      is_global: result.is_global,
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

  /**
   * Create a new user (creates both auth.users and public.users)
   */
  async createUser(data: CreateUserData): Promise<User> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'usersApi.ts:682',
        message: 'createUser called',
        data: {
          email: data.email,
          hasFirstName: !!data.first_name,
          hasLastName: !!data.last_name,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    // Check if user is authenticated before calling Edge Function
    const {
      data: { session },
    } = await supabase.auth.getSession();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'usersApi.ts:687',
        message: 'Session check',
        data: {
          hasSession: !!session,
          hasToken: !!session?.access_token,
          tokenLength: session?.access_token?.length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C',
      }),
    }).catch(() => {});
    // #endregion

    if (!session?.access_token) {
      throw new Error('Authentication required - please log in');
    }

    // With verify_jwt=false, we rely on middleware for auth
    // Pass Authorization header explicitly to middleware
    const { data: result, error } = await supabase.functions.invoke(
      'create-user',
      {
        body: {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b21c1bbc-918b-4be7-8e62-e18feb341829', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'usersApi.ts:695',
        message: 'Edge Function response',
        data: {
          hasError: !!error,
          errorMessage: error?.message,
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : [],
          resultData: result?.data,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
    // #endregion

    if (error) {
      console.error('Error creating user:', error);
      // Handle duplicate email error more gracefully
      const errorMessage = error.message || '';
      if (
        errorMessage.includes('already been registered') ||
        errorMessage.includes('email_exists')
      ) {
        throw new Error('A user with this email address already exists');
      }
      throw new Error(errorMessage || 'Failed to create user');
    }

    // Edge Function returns { success: true, data: {...} }
    // supabase.functions.invoke() wraps it in another data property
    const functionResponse = result?.data;

    // Check if the response indicates an error (even if no error object)
    if (
      functionResponse &&
      !functionResponse.success &&
      functionResponse.error
    ) {
      const errorMsg =
        functionResponse.error ||
        functionResponse.details ||
        'Failed to create user';
      if (
        errorMsg.includes('already been registered') ||
        errorMsg.includes('email_exists')
      ) {
        throw new Error('A user with this email address already exists');
      }
      throw new Error(errorMsg);
    }

    if (!functionResponse?.data) {
      throw new Error('Failed to create user - no data returned');
    }

    // Fetch the created user from public.users
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', functionResponse.data.userId)
      .single();

    if (fetchError || !user) {
      throw new Error(
        fetchError?.message || 'User created but could not be fetched'
      );
    }

    return user;
  },

  /**
   * Generate an invite link for a user
   */
  async generateInviteLink(userId: string): Promise<{ inviteLink: string }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required - please log in');
    }

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/generate-invite-link`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ userId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Error generating invite link - response:', {
          status: response.status,
          statusText: response.statusText,
          responseData,
        });

        const errorMessage =
          responseData?.error ||
          `Failed to generate invite link (${response.status})`;
        const errorDetails = responseData?.details;

        if (errorDetails) {
          console.error('Error details:', errorDetails);
          try {
            const parsedDetails =
              typeof errorDetails === 'string'
                ? JSON.parse(errorDetails)
                : errorDetails;
            console.error('Parsed error details:', parsedDetails);
          } catch {
            console.error('Could not parse error details:', errorDetails);
          }
        }

        throw new Error(errorMessage);
      }

      // Edge Function returns { success: true, data: {...} }
      const functionResponse = responseData;
      if (!functionResponse || !functionResponse.success) {
        console.error('Function response error:', {
          success: functionResponse?.success,
          error: functionResponse?.error,
          details: functionResponse?.details,
          fullResponse: functionResponse,
        });
        throw new Error(
          functionResponse?.error ||
            'Failed to generate invite link - invalid response'
        );
      }

      if (!functionResponse.data?.inviteLink) {
        throw new Error('Failed to generate invite link - no link returned');
      }

      return { inviteLink: functionResponse.data.inviteLink };
    } catch (err: unknown) {
      console.error('Unexpected error generating invite link:', err);
      throw err;
    }
  },

  /**
   * Check if a user has a password set
   */
  async checkUserAuthStatus(userId: string): Promise<AuthStatus> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required - please log in');
    }

    const { data: result, error } = await supabase.functions.invoke(
      'check-user-auth-status',
      {
        body: {
          userId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      console.error('Error checking auth status:', error);
      throw new Error(error.message || 'Failed to check auth status');
    }

    // Edge Function returns { success: true, data: {...} }
    // supabase.functions.invoke() returns { data: edgeFunctionResponse }
    // So result = { success: true, data: { hasPassword } }
    const functionResponse = result;
    if (!functionResponse || !functionResponse.success) {
      throw new Error(
        functionResponse?.error ||
          'Failed to check auth status - invalid response'
      );
    }

    if (
      !functionResponse.data ||
      typeof functionResponse.data.hasPassword !== 'boolean'
    ) {
      throw new Error('Failed to check auth status - no data returned');
    }

    return { hasPassword: functionResponse.data.hasPassword };
  },

  /**
   * Admin reset user password
   * Allows admin to set a new password for a user
   */
  async adminResetUserPassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required - please log in');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/admin-reset-user-password`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage =
          responseData?.error ||
          `Failed to reset password (${response.status})`;
        throw new Error(errorMessage);
      }

      // Edge Function returns { success: true, data: {...} }
      const functionResponse = responseData;
      if (!functionResponse || !functionResponse.success) {
        throw new Error(
          functionResponse?.error ||
            'Failed to reset password - invalid response'
        );
      }
    } catch (err: unknown) {
      console.error('Unexpected error resetting user password:', err);
      throw err;
    }
  },
};

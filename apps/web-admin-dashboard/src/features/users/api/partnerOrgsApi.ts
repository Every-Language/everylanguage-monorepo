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

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching partner orgs:', error);
      throw new Error(error.message || 'Failed to fetch partner orgs');
    }

    // Fetch user counts for each partner org
    const orgsWithUserCounts = await Promise.all(
      (data || []).map(async org => {
        const { count: userCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('context_type', 'partner')
          .eq('context_id', org.id);

        return {
          ...org,
          user_count: userCount || 0,
        };
      })
    );

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: orgsWithUserCounts,
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
    const { data: created, error } = await supabase
      .from('partner_orgs')
      .insert({
        name: data.name,
        description: data.description || null,
        is_public: data.is_public ?? false,
        is_individual: data.is_individual ?? false,
      })
      .select()
      .single();

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
   */
  async fetchPartnerOrgUsers(
    partnerOrgId: string
  ): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(
        `
        *,
        roles (*),
        users (*)
      `
      )
      .eq('context_type', 'partner')
      .eq('context_id', partnerOrgId);

    if (error) {
      console.error('Error fetching partner org users:', error);
      throw new Error(error.message || 'Failed to fetch partner org users');
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
   * Assign user to partner org with role
   */
  async assignUserToPartnerOrg(
    partnerOrgId: string,
    userId: string,
    roleId: string
  ): Promise<UserRoleAssignment> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        context_type: 'partner',
        context_id: partnerOrgId,
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
      throw new Error(error.message || 'Failed to assign user to partner org');
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
};

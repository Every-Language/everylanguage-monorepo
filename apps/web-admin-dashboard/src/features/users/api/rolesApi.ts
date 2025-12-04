import { supabase } from '@/shared/services/supabase';
import type {
  Role,
  ResourceType,
  RoleWithPermissions,
  RolePermission,
  CreateRoleData,
  UpdateRoleData,
} from '../types';
import type { Database } from '@everylanguage/shared-types';

type PermissionKey = Database['public']['Enums']['permission_key'];

export const rolesApi = {
  /**
   * Fetch all roles with permission counts and permission keys
   */
  async fetchRoles(): Promise<RoleWithPermissions[]> {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('resource_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching roles:', error);
      throw new Error(error.message || 'Failed to fetch roles');
    }

    // Fetch permissions for each role
    const rolesWithPermissions = await Promise.all(
      (roles || []).map(async role => {
        const { data: permissions } = await supabase
          .from('role_permissions')
          .select('*')
          .eq('role_id', role.id)
          .order('resource_type', { ascending: true })
          .order('permission_key', { ascending: true });

        const rolePermissions: RolePermission[] = (permissions || []).map(
          perm => ({
            id: perm.id,
            role_id: perm.role_id,
            resource_type: perm.resource_type as ResourceType,
            permission_key: perm.permission_key as PermissionKey,
            is_allowed: perm.is_allowed,
            created_at: perm.created_at,
          })
        );

        return {
          ...role,
          permission_count: rolePermissions.length,
          permissions: rolePermissions,
        };
      })
    );

    return rolesWithPermissions;
  },

  /**
   * Fetch single role with all permissions
   */
  async fetchRoleById(roleId: string): Promise<RoleWithPermissions | null> {
    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) {
      console.error('Error fetching role:', error);
      throw new Error(error.message || 'Failed to fetch role');
    }

    if (!role) return null;

    // Fetch permissions for this role
    const permissions = await this.fetchRolePermissions(roleId);

    return {
      ...role,
      permission_count: permissions.length,
      permissions,
    };
  },

  /**
   * Fetch all permissions for a role
   */
  async fetchRolePermissions(roleId: string): Promise<RolePermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId)
      .order('resource_type', { ascending: true })
      .order('permission_key', { ascending: true });

    if (error) {
      console.error('Error fetching role permissions:', error);
      throw new Error(error.message || 'Failed to fetch role permissions');
    }

    return (data || []).map(perm => ({
      id: perm.id,
      role_id: perm.role_id,
      resource_type: perm.resource_type as ResourceType,
      permission_key: perm.permission_key as PermissionKey,
      is_allowed: perm.is_allowed,
      created_at: perm.created_at,
    }));
  },

  /**
   * Create new role
   */
  async createRole(data: CreateRoleData): Promise<Role> {
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        name: data.name,
        role_key: data.role_key,
        resource_type: data.resource_type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      throw new Error(error.message || 'Failed to create role');
    }

    return role;
  },

  /**
   * Update role
   */
  async updateRole(roleId: string, data: UpdateRoleData): Promise<Role> {
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      throw new Error(error.message || 'Failed to update role');
    }

    return role;
  },

  /**
   * Delete role (cascades to role_permissions)
   */
  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      throw new Error(error.message || 'Failed to delete role');
    }
  },

  /**
   * Add permission to role
   */
  async addPermissionToRole(
    roleId: string,
    permissionKey: PermissionKey,
    resourceType: ResourceType,
    isAllowed: boolean = true
  ): Promise<RolePermission> {
    const { data, error } = await supabase
      .from('role_permissions')
      .insert({
        role_id: roleId,
        permission_key: permissionKey,
        resource_type: resourceType,
        is_allowed: isAllowed,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding permission to role:', error);
      throw new Error(error.message || 'Failed to add permission to role');
    }

    return {
      id: data.id,
      role_id: data.role_id,
      resource_type: data.resource_type as ResourceType,
      permission_key: data.permission_key as PermissionKey,
      is_allowed: data.is_allowed,
      created_at: data.created_at,
    };
  },

  /**
   * Remove permission from role
   */
  async removePermissionFromRole(
    roleId: string,
    permissionKey: PermissionKey,
    resourceType: ResourceType
  ): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_key', permissionKey)
      .eq('resource_type', resourceType);

    if (error) {
      console.error('Error removing permission from role:', error);
      throw new Error(error.message || 'Failed to remove permission from role');
    }
  },

  /**
   * Update permission status (allow/deny)
   */
  async updatePermissionStatus(
    roleId: string,
    permissionKey: PermissionKey,
    resourceType: ResourceType,
    isAllowed: boolean
  ): Promise<RolePermission> {
    const { data, error } = await supabase
      .from('role_permissions')
      .update({ is_allowed: isAllowed })
      .eq('role_id', roleId)
      .eq('permission_key', permissionKey)
      .eq('resource_type', resourceType)
      .select()
      .single();

    if (error) {
      console.error('Error updating permission status:', error);
      throw new Error(error.message || 'Failed to update permission status');
    }

    return {
      id: data.id,
      role_id: data.role_id,
      resource_type: data.resource_type as ResourceType,
      permission_key: data.permission_key as PermissionKey,
      is_allowed: data.is_allowed,
      created_at: data.created_at,
    };
  },
};

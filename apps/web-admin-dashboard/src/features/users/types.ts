import type { Tables, Database } from '@everylanguage/shared-types';

// Base table types
export type User = Tables<'users'>;
export type UserRole = Tables<'user_roles'>;
export type Role = Tables<'roles'>;
export type Base = Tables<'bases'>;
export type PartnerOrg = Tables<'partner_orgs'>;

// Resource type enum
export type ResourceType = Database['public']['Enums']['resource_type'];

// Extended types with relations
export interface UserWithRoles extends User {
  roles?: UserRoleAssignment[];
  role_count?: number;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  project_id: string | null;
  base_id: string | null;
  partner_org_id: string | null;
  is_global: boolean;
  role: Role;
  entity_name?: string;
  entity_id?: string;
  user_email?: string;
  user_name?: string;
}

export interface EntitySearchResult {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  similarityScore?: number;
}

export interface RoleOption {
  id: string;
  name: string;
  role_key: string | null;
  resource_type: ResourceType | null;
}

export interface PartnerOrgWithUsers extends PartnerOrg {
  users?: UserRoleAssignment[];
  user_count?: number;
}

export interface BaseWithAssignments extends Base {
  users?: UserRoleAssignment[];
  user_count?: number;
  region?: {
    id: string;
    name: string;
  } | null;
}

// Update types
export interface UpdateUserData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

export interface CreatePartnerOrgData {
  name: string;
  description?: string | null;
  is_public?: boolean;
  is_individual?: boolean;
}

export interface UpdatePartnerOrgData {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  is_individual?: boolean;
}

export interface CreateBaseData {
  name: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
  is_public?: boolean;
}

export interface UpdateBaseData {
  name?: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
  is_public?: boolean;
}

// Role and Permission types
export interface RolePermission {
  id: string;
  role_id: string;
  resource_type: ResourceType;
  permission_key: string;
  is_allowed: boolean;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  permission_count?: number;
  permissions?: RolePermission[];
}

export interface CreateRoleData {
  name: string;
  role_key: string;
  resource_type: ResourceType;
}

export interface UpdateRoleData {
  name?: string;
  role_key?: string;
  resource_type?: ResourceType;
}

export interface PermissionEntry {
  permission_key: string;
  resource_type: ResourceType;
  is_allowed: boolean;
}

export interface CreateUserData {
  email: string;
  first_name?: string;
  last_name?: string;
  password?: string; // Optional - if provided, sets the user's password
}

export interface AuthStatus {
  hasPassword: boolean;
}

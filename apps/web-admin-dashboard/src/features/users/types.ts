import type { Tables, Database } from '@everylanguage/shared-types';

// Base table types
export type User = Tables<'users'>;
export type UserRole = Tables<'user_roles'>;
export type Role = Tables<'roles'>;
export type Team = Tables<'teams'>;
export type Base = Tables<'bases'>;
export type PartnerOrg = Tables<'partner_orgs'>;
export type BaseTeam = Tables<'bases_teams'>;

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
  context_type: string | null;
  context_id: string | null;
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

export interface TeamWithAssignments extends Team {
  users?: UserRoleAssignment[];
  user_count?: number;
  bases?: BaseTeamAssignment[];
  base_count?: number;
}

export interface BaseTeamAssignment {
  id: string;
  team_id: string;
  base_id: string;
  role_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  team?: Team;
  base?: Base;
  role?: Role;
}

export interface BaseWithAssignments extends Base {
  users?: UserRoleAssignment[];
  user_count?: number;
  teams?: BaseTeamAssignment[];
  team_count?: number;
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

export interface CreateTeamData {
  name: string;
  type?: string | null;
}

export interface UpdateTeamData {
  name?: string;
  type?: string | null;
}

export interface CreateBaseData {
  name: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
}

export interface UpdateBaseData {
  name?: string;
  region_id?: string | null;
  location?: { lat: number; lng: number } | null;
}

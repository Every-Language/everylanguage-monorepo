import type { UserRole } from '../types';

/**
 * Check if user has system_admin role
 * Admin dashboard requires system_admin role to access
 */
export function isSystemAdmin(userRoles: UserRole[]): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  // Check if user has system_admin role (role_key)
  return userRoles.some(
    role => role.role_key === 'system_admin' && role.resource_type === 'global'
  );
}

/**
 * Check if user has any of the required roles
 * For admin dashboard, we only check for system_admin
 */
export function hasRequiredRole(
  userRoles: UserRole[],
  requiredRoles: string[]
): boolean {
  if (!userRoles || userRoles.length === 0 || requiredRoles.length === 0) {
    return false;
  }

  // Check if user has any of the required roles
  return userRoles.some(role => requiredRoles.includes(role.role_key));
}

/**
 * Check if user has a specific role key
 */
export function hasRole(userRoles: UserRole[], roleKey: string): boolean {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  return userRoles.some(role => role.role_key === roleKey);
}

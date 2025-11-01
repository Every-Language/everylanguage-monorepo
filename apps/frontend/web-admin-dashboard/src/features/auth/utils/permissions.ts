import type { User } from '@supabase/supabase-js';

/**
 * Check if user has system.admin permission
 * Admin dashboard requires system.admin permission to access
 */
export function isSystemAdmin(user: User | null): boolean {
  if (!user) {
    return false;
  }

  // Check app_metadata for system admin role
  if (user.app_metadata?.roles) {
    const roles = Array.isArray(user.app_metadata.roles)
      ? user.app_metadata.roles
      : [user.app_metadata.roles];

    // Check if user has system.admin permission
    return roles.includes('system.admin') || roles.includes('SYSTEM_ADMIN');
  }

  // Check user_metadata as fallback
  if (user.user_metadata?.roles) {
    const roles = Array.isArray(user.user_metadata.roles)
      ? user.user_metadata.roles
      : [user.user_metadata.roles];

    return roles.includes('system.admin') || roles.includes('SYSTEM_ADMIN');
  }

  return false;
}

/**
 * Check if user has any of the required roles
 * For admin dashboard, we only check for system.admin
 */
export function hasRequiredRole(
  user: User | null,
  requiredRoles: string[]
): boolean {
  if (!user || requiredRoles.length === 0) {
    return false;
  }

  // For admin dashboard, always check if user is system admin
  return isSystemAdmin(user);
}

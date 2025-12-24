/**
 * Normalize Supabase relation responses
 * Supabase can return relations as single objects, arrays, or null
 * This utility ensures consistent handling
 */

/**
 * Normalize a Supabase relation to a single object or null
 * Handles cases where Supabase returns T, T[], or null
 */
export function normalizeSupabaseRelation<T>(
  data: T | T[] | null | undefined
): T | null {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] : null;
  }
  return data;
}

/**
 * Normalize a Supabase relation to an array
 * Handles cases where Supabase returns T, T[], or null
 */
export function normalizeSupabaseRelations<T>(
  data: T | T[] | null | undefined
): T[] {
  if (data === null || data === undefined) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

/**
 * Ensure data is an array, converting single items or null to arrays
 */
export function ensureArray<T>(data: T | T[] | null | undefined): T[] {
  if (data === null || data === undefined) return [];
  if (Array.isArray(data)) return data;
  return [data];
}

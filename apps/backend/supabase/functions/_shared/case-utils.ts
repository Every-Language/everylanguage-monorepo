/**
 * Case transformation utilities for API boundary
 *
 * API contracts use camelCase (JavaScript/TypeScript standard)
 * Database uses snake_case (PostgreSQL standard)
 */

/**
 * Convert snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Deep convert object keys from snake_case to camelCase
 */
export function keysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamel(item)) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

/**
 * Deep convert object keys from camelCase to snake_case
 */
export function keysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnake(item)) as any;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {} as any);
  }

  return obj;
}

/**
 * Transform database row to API format (snake_case -> camelCase)
 */
export function dbToApi<T = any>(data: any): T {
  return keysToCamel(data);
}

/**
 * Transform API request to database format (camelCase -> snake_case)
 */
export function apiToDb<T = any>(data: any): T {
  return keysToSnake(data);
}

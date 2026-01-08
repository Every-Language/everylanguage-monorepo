/**
 * API Key validation middleware for public Bible API endpoints
 *
 * Validates API key from X-API-Key header against environment variable.
 * For Phase 1, uses PUBLIC_BIBLE_API_KEY environment variable.
 * Future enhancement: migrate to database table for key rotation and tracking.
 */

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates the API key from request headers
 *
 * @param req - The incoming request
 * @returns Validation result with valid flag and optional error message
 */
export function validateApiKey(req: Request): ApiKeyValidationResult {
  const apiKey = req.headers.get('X-API-Key');

  if (!apiKey) {
    return {
      valid: false,
      error: 'Missing API key. Provide X-API-Key header.',
    };
  }

  const expectedApiKey = Deno.env.get('PUBLIC_BIBLE_API_KEY');

  if (!expectedApiKey) {
    console.error('PUBLIC_BIBLE_API_KEY environment variable not configured');
    return {
      valid: false,
      error: 'API key validation not configured',
    };
  }

  if (apiKey !== expectedApiKey) {
    return {
      valid: false,
      error: 'Invalid API key',
    };
  }

  return { valid: true };
}

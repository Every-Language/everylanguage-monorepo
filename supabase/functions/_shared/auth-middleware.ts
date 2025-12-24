import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './response-utils.ts';

export interface AuthenticatedContext {
  supabaseClient: any;
  user: any;
  publicUserId: string;
  isAnonymous: boolean;
}

export interface AuthError {
  status: number;
  error: string;
  details?: string;
}

/**
 * Authentication middleware for Edge Functions
 * Handles CORS, user authentication, and public user ID retrieval
 * Optimized: Uses fast user ID getter since auth.users.id now equals public.users.id
 * Supports both anonymous and authenticated users
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthenticatedContext | AuthError> {
  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return {
        status: 401,
        error: 'Authentication required',
        details: 'Missing Authorization header',
      };
    }

    // Extract token from Bearer format
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return {
        status: 401,
        error: 'Authentication required',
        details: 'Invalid Authorization header format',
      };
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Get authenticated user by passing token directly
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return {
        status: 401,
        error: 'Authentication required',
        details: authError?.message,
      };
    }

    // Optimization: Since public.users.id now equals auth.users.id,
    // we can use the fast getter without database validation
    // The auth check above already confirms the user is valid
    const publicUserId = user.id;
    if (!publicUserId) {
      return {
        status: 400,
        error: 'Invalid user ID',
      };
    }

    return {
      supabaseClient,
      user,
      publicUserId,
      isAnonymous: user.is_anonymous ?? false,
    };
  } catch (error: unknown) {
    return {
      status: 500,
      error: 'Authentication failed',
      details:
        error instanceof Error ? error.message : 'Unknown authentication error',
    };
  }
}

/**
 * Helper to check if result is an error
 */
export function isAuthError(
  result: AuthenticatedContext | AuthError
): result is AuthError {
  return 'status' in result;
}

/**
 * Helper to create error response from auth error
 */
export function createAuthErrorResponse(authError: AuthError): Response {
  const responseBody = {
    success: false,
    error: authError.error,
    details: authError.details,
  };

  return new Response(JSON.stringify(responseBody), {
    status: authError.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

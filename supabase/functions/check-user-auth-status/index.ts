import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';

interface CheckAuthStatusRequest {
  userId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate the request - only logged-in admins can check auth status
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      return createAuthErrorResponse(authCtx);
    }

    let body: CheckAuthStatusRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return createErrorResponse('userId is required', 400);
    }

    // Use service role key to query auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query auth.users to check if password is set
    // encrypted_password being non-null indicates password is set
    const { data: authUser, error: fetchError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (fetchError) {
      console.error('Error fetching auth user:', fetchError);
      return createErrorResponse(
        `Failed to fetch user: ${fetchError.message}`,
        500
      );
    }

    if (!authUser.user) {
      return createErrorResponse('User not found', 404);
    }

    // Check if user has a password set
    // In Supabase, encrypted_password is set when user has a password
    const hasPassword = !!authUser.user.encrypted_password;

    return createSuccessResponse({
      hasPassword,
    });
  } catch (error) {
    console.error('Unexpected error in check-user-auth-status:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

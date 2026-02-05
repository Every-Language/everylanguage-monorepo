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

interface AdminResetPasswordRequest {
  userId: string;
  newPassword: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate the request - only logged-in admins can reset user passwords
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      return createAuthErrorResponse(authCtx);
    }

    let body: AdminResetPasswordRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { userId, newPassword } = body;

    if (!userId || typeof userId !== 'string') {
      return createErrorResponse('userId is required', 400);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return createErrorResponse('newPassword is required', 400);
    }

    // Validate password strength - match Supabase config minimum (4 characters)
    if (newPassword.length < 4) {
      return createErrorResponse('Password must be at least 4 characters', 400);
    }

    // Use service role key for Admin API operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return createErrorResponse('Server configuration error', 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Update user password using Admin API
    const { data: updatedUser, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return createErrorResponse(
        `Failed to update password: ${updateError.message}`,
        500
      );
    }

    if (!updatedUser.user) {
      return createErrorResponse('User not found', 404);
    }

    return createSuccessResponse({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error in admin-reset-user-password:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

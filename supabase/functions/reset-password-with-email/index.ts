import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface ResetPasswordWithEmailRequest {
  accessToken: string;
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
    let body: ResetPasswordWithEmailRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { accessToken, newPassword } = body;

    // Validate required fields
    if (
      !accessToken ||
      typeof accessToken !== 'string' ||
      !accessToken.trim()
    ) {
      return createErrorResponse('accessToken is required', 400);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return createErrorResponse('newPassword is required', 400);
    }

    // Validate password strength (min 8 characters)
    if (newPassword.length < 8) {
      return createErrorResponse('Password must be at least 8 characters', 400);
    }

    // Use service role key for Admin API operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return createErrorResponse('Server configuration error', 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify reset token and get user ID using Admin API
    // Note: We use getUser() with the access token to verify it and extract user ID
    // This doesn't create a client session - it's a server-side verification
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (userError) {
      console.error('Error verifying reset token:', userError);

      // Provide user-friendly error messages
      if (
        userError.message.includes('expired') ||
        userError.message.includes('invalid') ||
        userError.message.includes('JWT')
      ) {
        return createErrorResponse('Invalid or expired reset token', 400);
      }

      return createErrorResponse(
        `Token verification failed: ${userError.message}`,
        400
      );
    }

    if (!userData.user) {
      return createErrorResponse(
        'User not found after token verification',
        404
      );
    }

    const userId = userData.user.id;

    // Update user password using Admin API
    // Note: We only need user ID here, token is not needed for password update
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

    // Return success response (no session in response)
    return createSuccessResponse({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error in reset-password-with-email:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

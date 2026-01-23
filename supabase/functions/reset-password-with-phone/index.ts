import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';

interface ResetPasswordWithPhoneRequest {
  phone: string;
  otp: string;
  newPassword: string;
}

/**
 * Normalize phone number to E.164 format
 * Basic normalization - removes spaces, dashes, parentheses
 * Full E.164 normalization should ideally be done client-side, but this provides basic cleanup
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If phone doesn't start with +, assume it needs country code
  // For now, return as-is and let Supabase handle validation
  // Client should send in E.164 format
  return normalized;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    let body: ResetPasswordWithPhoneRequest;
    try {
      body = await req.json();
    } catch {
      return createErrorResponse('Invalid JSON', 400);
    }

    const { phone, otp, newPassword } = body;

    // Validate required fields
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return createErrorResponse('phone is required', 400);
    }

    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      return createErrorResponse('otp is required', 400);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return createErrorResponse('newPassword is required', 400);
    }

    // Validate OTP format (4-6 digits)
    if (!/^\d{4,6}$/.test(otp)) {
      return createErrorResponse('otp must be 4-6 digits', 400);
    }

    // Validate password strength (min 8 characters)
    if (newPassword.length < 8) {
      return createErrorResponse('Password must be at least 8 characters', 400);
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone.trim());

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

    // Verify OTP using Admin API
    // Note: Supabase's verifyOtp requires both phone and OTP because:
    // 1. OTP is phone-specific (not globally unique)
    // 2. Supabase needs phone to look up the correct OTP
    // After verification, we get user ID and only need that for password update
    // This may create a session internally, but we won't return it to the client
    const { data: verifyData, error: verifyError } =
      await supabaseAdmin.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: 'sms',
      });

    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);

      // Provide user-friendly error messages
      if (
        verifyError.message.includes('expired') ||
        verifyError.message.includes('invalid')
      ) {
        return createErrorResponse('Invalid or expired OTP', 400);
      }

      return createErrorResponse(
        `OTP verification failed: ${verifyError.message}`,
        400
      );
    }

    if (!verifyData.user) {
      return createErrorResponse('User not found after OTP verification', 404);
    }

    const userId = verifyData.user.id;

    // Update user password using Admin API
    // Note: We only need user ID here, phone number is not needed for password update
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
    console.error('Unexpected error in reset-password-with-phone:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

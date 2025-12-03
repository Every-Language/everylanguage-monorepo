/**
 * Email confirmation callback handler for Supabase Auth
 * This route handles the redirect after users click the confirmation link in their email
 *
 * Supabase redirects here with either:
 * - A `code` parameter (most common) - exchange for session
 * - A `token_hash` parameter (direct link) - verify OTP
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';

  const supabase = await createClient();

  // Handle code exchange (most common flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully confirmed email and created session
      // Redirect to dashboard (user is now logged in)
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Handle token_hash verification (direct link flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'recovery' | 'email_change',
    });

    if (!error) {
      // Successfully confirmed email and created session
      // Redirect to dashboard (user is now logged in)
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    new URL('/login?error=email_confirmation_failed', request.url)
  );
}

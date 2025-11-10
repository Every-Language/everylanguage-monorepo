/**
 * OAuth callback handler for Supabase Auth
 * This route handles the redirect after OAuth login (Google, etc.)
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    new URL('/login?error=oauth_failed', request.url)
  );
}

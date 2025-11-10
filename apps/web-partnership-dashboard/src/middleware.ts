/**
 * Next.js Middleware for authentication and session management
 * This runs on every request before it reaches the route
 */

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/partner-org',
    '/profile',
    '/project',
    '/team',
    '/base',
  ];

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect to login if accessing protected route without authentication
  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, fonts
     * - api/auth/callback (OAuth callbacks)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/auth/callback).*)',
    '/dashboard/:path*',
    '/partner-org/:path*',
  ],
};

/**
 * Next.js Middleware for authentication and session management
 * This runs on every request before it reaches the route
 */

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    const { response, user } = await updateSession(request);
    const { pathname } = request.nextUrl;

    // Protected routes that require authentication
    const protectedRoutes = [
      '/partner-org',
      '/profile',
      '/project',
      '/team',
      '/base',
    ];

    const isProtected = protectedRoutes.some(route =>
      pathname.startsWith(route)
    );

    // Redirect to login if accessing protected route without authentication
    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch (error) {
    // Log error but don't block the request
    console.error('Middleware error:', error);
    // Return a basic response to prevent middleware failure
    return NextResponse.next();
  }
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

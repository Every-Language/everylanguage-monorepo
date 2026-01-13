/**
 * Environment variable validation and type-safe access
 * This file ensures all required environment variables are present at runtime
 */

/**
 * Get Supabase configuration based on NEXT_PUBLIC_SUPABASE_ENV
 * Supports switching between 'local' and 'dev' environments
 */
export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
} {
  const env = process.env.NEXT_PUBLIC_SUPABASE_ENV || 'dev';

  if (env === 'local') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL_LOCAL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL;

    if (!url || !anonKey) {
      throw new Error(
        'Missing local Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL_LOCAL and NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL'
      );
    }

    return { url, anonKey };
  }

  // Default to dev environment
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV;

  if (!url || !anonKey) {
    throw new Error(
      'Missing dev Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL_DEV and NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV'
    );
  }

  return { url, anonKey };
}

// Direct access to environment variables
// Next.js inlines these at build time for NEXT_PUBLIC_ vars
// Note: For Supabase, use getSupabaseConfig() instead
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_ENABLE_DONATE: process.env.NEXT_PUBLIC_ENABLE_DONATE !== 'false',
  NEXT_PUBLIC_ENABLE_PROJECTS:
    process.env.NEXT_PUBLIC_ENABLE_PROJECTS !== 'false',
  NEXT_PUBLIC_ENABLE_OPERATIONS:
    process.env.NEXT_PUBLIC_ENABLE_OPERATIONS !== 'false',
} as const;

// Server-side only environment variables
// These are NOT exposed to the client and should only be accessed in server components or API routes
export const serverEnv = {
  JOSHUA_PROJECT_API_KEY: process.env.JOSHUA_PROJECT_API_KEY || '',
} as const;

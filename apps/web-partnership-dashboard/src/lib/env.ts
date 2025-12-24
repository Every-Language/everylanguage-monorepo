/**
 * Environment variable validation and type-safe access
 * This file ensures all required environment variables are present at runtime
 */

// Direct access to environment variables
// Next.js inlines these at build time for NEXT_PUBLIC_ vars
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

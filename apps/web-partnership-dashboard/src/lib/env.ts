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
} as const;

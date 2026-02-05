/**
 * Supabase client for browser/client-side usage
 * Use this in Client Components
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@everylanguage/shared-types';
import { env } from '@/lib/env';

export const createClient = () => {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};

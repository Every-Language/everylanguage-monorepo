/**
 * Supabase client for Server Components
 * Use this in Server Components, Server Actions, and Route Handlers
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@everylanguage/shared-types';

export const createClient = async () => {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    const errorMessage = `Missing Supabase environment variables: ${missingVars.join(', ')}. Environment: ${process.env.NODE_ENV || 'unknown'}`;
    console.error('[Supabase Client]', errorMessage);
    throw new Error(errorMessage);
  }

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: any }>
      ) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
};

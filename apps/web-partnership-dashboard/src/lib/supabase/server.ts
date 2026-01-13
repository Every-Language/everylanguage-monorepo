/**
 * Supabase client for Server Components
 * Use this in Server Components, Server Actions, and Route Handlers
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@everylanguage/shared-types';
import { getSupabaseConfig } from '../env';

export const createClient = async () => {
  const cookieStore = await cookies();

  const { url: supabaseUrl, anonKey: supabaseKey } = getSupabaseConfig();

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

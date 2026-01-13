/**
 * Supabase client for browser/client-side usage
 * Use this in Client Components
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@everylanguage/shared-types';
import { getSupabaseConfig } from '../env';

export const createClient = () => {
  const { url: supabaseUrl, anonKey: supabaseKey } = getSupabaseConfig();

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};

/**
 * Legacy Supabase client - DEPRECATED in Next.js migration
 * Use @/lib/supabase/client instead for browser usage
 * This file is kept for backward compatibility during migration
 *
 * NOTE: Client is created lazily to avoid throwing errors during static page generation
 * if environment variables are not available at build time.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@everylanguage/shared-types';

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }

    supabaseClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

// Lazy getter that creates the client on first access
export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserClient<Database>>,
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      const value = client[prop as keyof typeof client];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

// Helper function to check if client is properly initialized
export const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('id').limit(1);

    // If there's no error, connection is working
    return !error;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

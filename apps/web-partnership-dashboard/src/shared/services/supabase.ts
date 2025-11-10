/**
 * Legacy Supabase client - DEPRECATED in Next.js migration
 * Use @/lib/supabase/client instead for browser usage
 * This file is kept for backward compatibility during migration
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@everylanguage/shared-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);

// Helper function to check if client is properly initialized
export const isSupabaseConnected = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);

    // If there's no error, connection is working
    return !error;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

// Log successful initialization
console.log('Supabase client initialized successfully');

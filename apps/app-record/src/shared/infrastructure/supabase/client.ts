import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@everylanguage/shared-types';

import {
  env,
  getRequiredEnvVar,
  environmentInfo,
  debugEnvironmentConfig,
} from '@/shared/config/env';
import { logger } from '@/shared/utils/logger';

// Define proper types for global and process
interface GlobalWithProcess {
  process?: {
    env?: {
      [key: string]: string | undefined;
    };
  };
}

// Debug utility to check Supabase configuration
export function debugSupabaseConfig() {
  debugEnvironmentConfig();
  logger.debug('Supabase Configuration Debug:', {
    buildProfile: environmentInfo.buildProfile,
    configType: environmentInfo.configType,
    isProduction: environmentInfo.isProduction,
    url: env.supabase.url
      ? `${env.supabase.url.substring(0, 20)}...`
      : '[MISSING]',
    anonKey: env.supabase.anonKey ? '[REDACTED]' : '[MISSING]',
    hasProcessEnv: !!(global as GlobalWithProcess).process?.env,
  });
}

// Validate environment variables before creating client
let supabaseUrl: string;
let supabaseAnonKey: string;

try {
  supabaseUrl = getRequiredEnvVar('EXPO_PUBLIC_SUPABASE_URL', env.supabase.url);
  supabaseAnonKey = getRequiredEnvVar(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    env.supabase.anonKey
  );
} catch (error) {
  logger.error('Failed to load Supabase environment variables:', error);
  debugSupabaseConfig();
  throw new Error(
    `Supabase configuration is missing for ${environmentInfo.configType} config (build profile: ${environmentInfo.buildProfile}). Please check your environment variables.`
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Verify client was created successfully
if (!supabase) {
  throw new Error('Failed to create Supabase client');
}

// Note: AppState listener for auth token refresh is now managed by useSupabaseAppState hook
// This prevents memory leaks and ensures proper cleanup

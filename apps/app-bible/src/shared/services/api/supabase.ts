import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@everylanguage/shared-types';

// Logging configuration for this module
const ENABLE_LOGGING = false;

import {
  env,
  getRequiredEnvVar,
  environmentInfo,
  debugEnvironmentConfig,
} from '@/app/config/env';
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
  logger.debug(ENABLE_LOGGING, 'Supabase Configuration Debug:', {
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
  logger.error(
    ENABLE_LOGGING,
    'Failed to load Supabase environment variables:',
    error
  );
  debugSupabaseConfig();
  throw new Error(
    `Supabase configuration is missing for ${environmentInfo.configType} config (build profile: ${environmentInfo.buildProfile}). Please check your environment variables.`
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid Supabase URL format. Must start with https://');
}

// Log which configuration we're using (for debugging)
// logger.info(ENABLE_LOGGING, `🔧 Supabase Client Configuration:`, {
//   buildProfile: environmentInfo.buildProfile,
//   configType: environmentInfo.configType,
//   url: `${supabaseUrl.substring(0, 30)}...`,
//   isProduction: environmentInfo.isProduction,
// });

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Tell React Native to use our fast refresh
if (AppState.currentState === 'active') {
  // Only set up listeners in active state
  AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// Verify client was created successfully
if (!supabase) {
  throw new Error('Failed to create Supabase client');
}

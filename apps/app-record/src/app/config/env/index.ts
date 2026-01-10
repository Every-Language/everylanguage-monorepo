import { logger } from '../../../shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = true;

// Ensure TS knows about the specific EXPO_PUBLIC_* keys so we can use dot access
declare const process: {
  env: {
    EXPO_PUBLIC_ENVIRONMENT?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_POWERSYNC_RECORD_URL?: string;
  };
};

// Define proper types for process.env (see declaration below)

// Get current environment from build profile
const getCurrentEnvironment = () => {
  return process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
};

// Determine config type based on environment
// development = dev config, production = prod config
const getConfigType = () => {
  const environment = getCurrentEnvironment();
  return environment === 'production' ? 'prod' : 'dev';
};

// Environment-specific configurations
// Uses generic variable names that are set differently per environment (dev/prod)
const environmentConfigs = {
  dev: {
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    powersync: {
      url: process.env.EXPO_PUBLIC_POWERSYNC_RECORD_URL || '',
    },
  },
  prod: {
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    powersync: {
      url: process.env.EXPO_PUBLIC_POWERSYNC_RECORD_URL || '',
    },
  },
} as const;

// Get current environment config
const currentEnvironment = getCurrentEnvironment();
const configType = getConfigType();
export const env = environmentConfigs[configType];

// Export environment info for debugging
export const environmentInfo = {
  buildProfile: currentEnvironment,
  configType,
  isProduction: configType === 'prod',
  isDevelopment: configType === 'dev',
};

// Type-safe environment variable access
export function getRequiredEnvVar(name: string, value?: string): string {
  if (!value || value.trim() === '') {
    logger.error(
      ENABLE_LOGGING,
      `Missing or empty environment variable: ${name}`
    );
    logger.error(ENABLE_LOGGING, 'Environment info:', environmentInfo);
    logger.error(ENABLE_LOGGING, 'Available environment variables:', {
      EXPO_PUBLIC_SUPABASE_URL: env.supabase.url ? '[SET]' : '[MISSING]',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: env.supabase.anonKey
        ? '[REDACTED]'
        : '[MISSING]',
      EXPO_PUBLIC_POWERSYNC_RECORD_URL: env.powersync.url
        ? '[SET]'
        : '[MISSING]',
    });
    throw new Error(
      `Missing required environment variable: ${name} for config type: ${configType}`
    );
  }
  return value;
}

// Debug function to log current configuration
export function debugEnvironmentConfig() {
  logger.debug(ENABLE_LOGGING, 'Environment Configuration:', {
    buildProfile: currentEnvironment,
    configType,
    supabaseUrl: env.supabase.url
      ? `${env.supabase.url.substring(0, 30)}...`
      : '[MISSING]',
    powersyncUrl: env.powersync.url
      ? `${env.powersync.url.substring(0, 30)}...`
      : '[MISSING]',
  });
}

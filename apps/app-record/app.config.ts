// Expo dynamic app config to inject runtime-friendly env into Constants.expoConfig.extra
// This ensures values are available at runtime in release APKs (export:embed bundles)

// Load .env for local builds — ensure we resolve from repo root even if CWD is android/
const { config: dotenvConfig } = require('dotenv');
const path = require('node:path');

dotenvConfig({ path: path.resolve(__dirname, '.env') });

// Base static config
const base = {
  name: 'OMT Record',
  slug: 'app-record',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.everylanguage.record',
  },
  android: {
    package: 'com.everylanguage.record',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  web: {},
  scheme: 'omt-record',
  newArchEnabled: true,
  extra: {
    router: { origin: false },
  },
  owner: 'every-language',
} as const;

module.exports = () => {
  const environment = process.env['EXPO_PUBLIC_ENVIRONMENT'] || 'development';

  const config = {
    ...base,
    // Merge existing extras with our environment-backed values
    extra: {
      ...(base.extra ?? {}),

      // Always expose the environment so JS can branch appropriately
      EXPO_PUBLIC_ENVIRONMENT: environment,

      // Generic environment variables (set differently per environment in CI/CD)
      // Development environment: points to dev Supabase
      // Production environment: points to prod Supabase
      EXPO_PUBLIC_SUPABASE_URL: process.env['EXPO_PUBLIC_SUPABASE_URL'],
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
    },
  };

  return config;
};

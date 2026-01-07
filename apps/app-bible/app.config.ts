/// <reference types="node" />

// Expo dynamic app config to inject runtime-friendly env into Constants.expoConfig.extra
// This ensures values are available at runtime in release APKs (export:embed bundles)

// Load env for local builds.
// For `app-bible` we intentionally prefer the app-local `.env` file so this app
// can run independently inside the monorepo.
//
// NOTE: Expo CLI already loads `.env` files automatically for many workflows, but
// we keep this fallback so `app.config.ts` can still populate `extra` reliably.
let dotenvConfig:
  | ((opts: { path: string; override?: boolean }) => void)
  | null = null;
try {
  ({ config: dotenvConfig } = require('dotenv'));
} catch {
  // dotenv isn't installed in this workspace; skip explicit loading.
}
const path = require('node:path');

const appRoot = __dirname;

// Load app-local `.env` and override any existing values (including shell env).
dotenvConfig?.({ path: path.resolve(appRoot, '.env'), override: true });

// Base static config migrated from app.json to avoid duplicate static config warnings
const base = {
  name: 'EL Bible',
  slug: 'el-bible',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.everylanguage.elbible',
    infoPlist: {
      UIBackgroundModes: [
        'fetch',
        'processing',
        'audio',
        'remote-notification',
      ],
      NSMicrophoneUsageDescription:
        'This app does not use the microphone. Audio playback is for Bible content only.',
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          'everylanguage.org': {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionMinimumTLSVersion: '1.2',
          },
        },
      },
      NSCameraUsageDescription: 'This app does not use the camera.',
      NSPhotoLibraryUsageDescription:
        'This app does not access your photo library.',
      NSLocationUsageDescription:
        'This app uses location to provide region-specific Bible content and language recommendations.',
      NSLocationWhenInUseUsageDescription:
        'This app uses location to provide region-specific Bible content and language recommendations.',
      NSLocationAlwaysUsageDescription:
        'This app uses location to provide region-specific Bible content and language recommendations.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'This app uses location to provide region-specific Bible content and language recommendations.',
      NSContactsUsageDescription: 'This app does not access your contacts.',
      NSBluetoothAlwaysUsageDescription: 'This app does not use Bluetooth.',
      NSBluetoothPeripheralUsageDescription:
        'This app does not use Bluetooth peripherals.',
      NSFaceIDUsageDescription: 'This app does not use Face ID.',
      NSLocalNetworkUsageDescription:
        'This app may access your local network for content synchronization.',
      NSUserTrackingUsageDescription:
        "This app does not track you across other companies' apps or websites.",
      ITSAppUsesNonExemptEncryption: false,
      LSSupportsOpeningDocumentsInPlace: true,
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'EL Bible Package',
          LSItemContentTypes: ['com.everylanguage.elpkg'],
          LSTypeIsPackage: true,
          CFBundleTypeRole: 'Viewer',
          LSHandlerRank: 'Default',
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'com.everylanguage.elpkg',
          UTTypeDescription: 'EL Bible Package',
          UTTypeConformsTo: ['public.zip-archive', 'public.data'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['elpkg'],
            'public.mime-type': 'application/vnd.everylanguage.elpkg',
          },
        },
      ],
    },
    entitlements: {
      'com.apple.developer.associated-domains': [
        'applinks:bible.everylanguage.com',
      ],
    },
    appleTeamId: 'L3N2828T7B',
  },
  android: {
    package: 'com.everylanguage.elbible',
    allowBackup: false,
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon-foreground.png',
      backgroundColor: '#282827',
    },
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          { mimeType: 'application/vnd.everylanguage.elpkg' },
          { scheme: 'content', host: '*', pathPattern: '.*\\.elpkg' },
          { scheme: 'file', host: '*', pathPattern: '.*\\.elpkg' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        data: [{ scheme: 'everylanguage' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'bible.everylanguage.com' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/8d2fb795-58b5-4eda-98b7-2cf9c20cf82c',
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  web: {},
  plugins: [
    'expo-font',
    'expo-localization',
    [
      'react-native-edge-to-edge',
      {
        // Note: parentTheme is static config and cannot be dynamic
        // The actual status bar styling is handled dynamically in StatusBarWrapper
        // using getSystemBarsStyle() helper function
        android: { parentTheme: 'Light', enforceNavigationBarContrast: false },
      },
    ],
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static', deploymentTarget: '15.5' },
        android: { usesCleartextTraffic: true },
      },
    ],
    ['expo-notifications', { color: '#ffffff' }],
    ['expo-audio', { microphonePermission: false }],
    [
      'expo-background-task',
      { backgroundModes: ['background-fetch', 'background-processing'] },
    ],
    'expo-task-manager',
    ['expo-document-picker', { iCloudContainerEnvironment: 'Production' }],
    [
      'expo-file-system',
      {
        photosPermission: false,
        savePhotosPermission: false,
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'This app uses location to provide region-specific Bible content and language recommendations.',
        locationAlwaysPermission:
          'This app uses location to provide region-specific Bible content and language recommendations.',
        locationWhenInUsePermission:
          'This app uses location to provide region-specific Bible content and language recommendations.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    'expo-asset',
    './plugins/sqlite-config-plugin.cjs',
  ],
  scheme: 'everylanguage',
  newArchEnabled: false,
  extra: {
    router: { origin: false },
    eas: { projectId: '8d2fb795-58b5-4eda-98b7-2cf9c20cf82c' },
  },
  owner: 'every-language',
} as const;

module.exports = () => {
  const environment = process.env['EXPO_PUBLIC_ENVIRONMENT'] || 'development';
  const resolveEnv = (key: string, fallbackKey?: string) =>
    process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);

  const config = {
    ...base,
    // Merge existing extras with our environment-backed values
    extra: {
      ...(base.extra ?? {}),

      // Always expose the environment so JS can branch appropriately
      EXPO_PUBLIC_ENVIRONMENT: environment,

      // Generic environment variables (set differently per environment in CI/CD)
      // Development environment: points to dev Supabase/PowerSync
      // Production environment: points to prod Supabase/PowerSync
      // Prefer already-prefixed EXPO_PUBLIC_* vars, but also support base vars in case
      // someone uses SUPABASE_URL style keys in the app-local `.env`.
      EXPO_PUBLIC_SUPABASE_URL: resolveEnv(
        'EXPO_PUBLIC_SUPABASE_URL',
        'SUPABASE_URL'
      ),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: resolveEnv(
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_ANON_KEY'
      ),
      EXPO_PUBLIC_POWERSYNC_URL: resolveEnv(
        'EXPO_PUBLIC_POWERSYNC_URL',
        'POWERSYNC_URL'
      ),
    },
  };

  return config;
};

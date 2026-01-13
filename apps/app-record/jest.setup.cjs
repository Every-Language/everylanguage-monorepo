/* eslint-env jest */

// Gesture handler jest setup (recommended by RNGH)
require('react-native-gesture-handler/jestSetup');

// Mock reanimated to avoid errors in tests
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence React Native Animated warning: "useNativeDriver"
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

// Mock AsyncStorage for predictable behavior in tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo for tests that rely on network state
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock')
);

// Mock logger to avoid console noise in tests
jest.mock('@/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock PowerSync System
jest.mock('@/shared/infrastructure/powersync/services/PowerSyncSystem', () => {
  const mockExecute = jest.fn();
  const mockGetAll = jest.fn();
  const mockGet = jest.fn();
  const mockWatch = jest.fn();

  return {
    powerSyncSystem: {
      isInitialized: true,
      isConnected: false,
      initialize: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      execute: mockExecute,
      getAll: mockGetAll,
      get: mockGet,
      watch: mockWatch,
      getStatus: jest.fn().mockReturnValue({
        initialized: true,
        connected: false,
        status: null,
      }),
    },
    PowerSyncSystem: {
      getInstance: jest.fn(() => ({
        isInitialized: true,
        isConnected: false,
        initialize: jest.fn().mockResolvedValue(undefined),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        execute: mockExecute,
        getAll: mockGetAll,
        get: mockGet,
        watch: mockWatch,
      })),
    },
  };
});

// Mock Supabase client
jest.mock('@/shared/infrastructure/supabase/client', () => {
  const mockAuth = {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  };

  return {
    supabase: {
      auth: mockAuth,
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          data: [],
          error: null,
        })),
        upsert: jest.fn(() => ({
          data: [],
          error: null,
        })),
        delete: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    },
  };
});

// Mock Expo modules
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/document/directory/',
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloaded: true,
      localUri: '/mock/local/uri',
      downloadAsync: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

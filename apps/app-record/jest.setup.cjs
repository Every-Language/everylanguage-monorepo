/* eslint-env jest */

// Extend Jest matchers for React Native Testing Library
require('@testing-library/jest-native/extend-expect');

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

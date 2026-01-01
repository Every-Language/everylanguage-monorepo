/* eslint-env jest */

// Extend Jest matchers for React Native Testing Library
// Note: This will only work if @testing-library/jest-native is installed
// Uncomment when you add testing dependencies:
// require('@testing-library/jest-native/extend-expect');

// Gesture handler jest setup (recommended by RNGH)
// Uncomment when react-native-gesture-handler is added:
// require('react-native-gesture-handler/jestSetup');

// Mock reanimated to avoid errors in tests
// Uncomment when react-native-reanimated is added:
// jest.mock('react-native-reanimated', () => {
//   const Reanimated = require('react-native-reanimated/mock');
//   Reanimated.default.call = () => {};
//   return Reanimated;
// });

// Silence React Native Animated warning: "useNativeDriver"
// Uncomment when needed:
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));

// Mock AsyncStorage for predictable behavior in tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo for tests that rely on network state
// Uncomment when @react-native-community/netinfo is added:
// jest.mock('@react-native-community/netinfo', () =>
//   require('@react-native-community/netinfo/jest/netinfo-mock')
// );

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => ({}));

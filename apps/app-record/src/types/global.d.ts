// Global type definitions for React Native environment
declare const global: typeof globalThis & {
  process?: {
    env?: {
      [key: string]: string | undefined;
    };
  };
};

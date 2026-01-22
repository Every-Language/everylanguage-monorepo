module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module-resolver',
        {
          extensions: [
            '.ios.js',
            '.android.js',
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.js',
            '.jsx',
            '.tsx',
            '.json',
          ],
          alias: {
            // More specific aliases must come first
            '@/powersync': './powersync',
            '@/features': './src/features',
            '@/shared': './src/shared',
            '@': './src',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};

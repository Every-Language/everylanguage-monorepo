module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
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
            '@': './src',
            '@/app': './src/app',
            '@/features': './src/features',
            '@/shared': './src/shared',
          },
        },
      ],
    ],
  };
};

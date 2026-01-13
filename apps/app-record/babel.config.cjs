module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
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
            '@/app': './src/app',
            '@/features': './src/features',
            '@/shared': './src/shared',
            '@': './src',
          },
        },
      ],
    ],
  };
};

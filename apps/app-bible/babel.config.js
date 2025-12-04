export default function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
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
}

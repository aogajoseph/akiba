// frontend/babel.config.js
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver', 'react-native-reanimated/plugin',
        {
          extensions: ['.ts', '.tsx', '.js', '.json'],
          alias: {
            '@': './',
            '@shared': '../shared',
          },
        },
      ],
    ],
  };
};